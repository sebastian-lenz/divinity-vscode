import { SymbolDoc, SymbolParameterDoc } from "../models/symbol";

/**
 * The doc parser is an adaption of the module djsdoc
 * https://github.com/EYHN/djsdoc
 *
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-present Zeit, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const NON_ASCII_WHITESPACES = [
  0x1680,
  0x2000,
  0x2001,
  0x2002,
  0x2003,
  0x2004,
  0x2005,
  0x2006,
  0x2007,
  0x2008,
  0x2009,
  0x200a,
  0x202f,
  0x205f,
  0x3000,
  0xfeff
];

/**
 * Return true if provided code is line terminator. Line terminator characters are formally defined in ECMA262.
 * @param {number} ch
 */
function isLineTerminator(ch: number): boolean {
  return ch === 0x0a || ch === 0x0d || ch === 0x2028 || ch === 0x2029;
}

/**
 * Return true if provided code is white space. White space characters are formally defined in ECMA262.
 * @param {number} ch
 */
function isWhiteSpace(ch: number): boolean {
  return (
    ch === 0x20 ||
    ch === 0x09 ||
    ch === 0x0b ||
    ch === 0x0c ||
    ch === 0xa0 ||
    (ch >= 0x1680 && NON_ASCII_WHITESPACES.indexOf(ch) >= 0)
  );
}

export interface DocCommentTag {
  title: string;
  content: string;
}

export class DocComment {
  readonly description: string;
  readonly source: string;
  readonly tags: Array<DocCommentTag>;
  private index: number;

  constructor(source: string) {
    this.source = source;
    this.index = 0;

    const description = this.readDescription();
    const tags = [];

    while (true) {
      const tag = this.readTag();
      if (!tag) break;
      tags.push(tag);
    }

    this.description = description;
    this.tags = tags;
  }

  private advance(): string {
    return String.fromCharCode(this.source.charCodeAt(this.index++));
  }

  private readContent() {
    const { source } = this;
    let content = "";
    let waiting = false;

    while (this.index < source.length) {
      const ch = source.charCodeAt(this.index);
      if (
        isLineTerminator(ch) &&
        !(
          ch === 0x0d /* '\r' */ && source.charCodeAt(this.index + 1) === 0x0a
        ) /* '\n' */
      ) {
        waiting = true;
      } else if (waiting) {
        if (ch === 0x40 /* '@' */) {
          break;
        }

        if (!isWhiteSpace(ch)) {
          waiting = false;
        }
      }

      content += this.advance();
    }

    return content.trim();
  }

  private readDescription(): string {
    const { source } = this;
    let description = "";
    let atAllowed = true;

    while (this.index < source.length) {
      let ch = source.charCodeAt(this.index);
      if (atAllowed && ch === 0x40 /* '@' */) {
        break;
      }

      if (isLineTerminator(ch)) {
        atAllowed = true;
      } else if (atAllowed && !isWhiteSpace(ch)) {
        atAllowed = false;
      }

      description += this.advance();
    }

    return description.trim();
  }

  private readTag(): DocCommentTag | null {
    if (!this.skipToTag()) {
      return null;
    }

    const title = this.readTitle();
    const content = this.readContent();
    return { content, title };
  }

  private readTitle(): string {
    const { source } = this;
    let title = "";

    // waste '@'
    this.advance();

    while (
      this.index < source.length &&
      !isWhiteSpace(source.charCodeAt(this.index)) &&
      !isLineTerminator(source.charCodeAt(this.index))
    ) {
      title += this.advance();
    }

    return title;
  }

  private skipToTag(): boolean {
    const { source } = this;

    while (
      this.index < source.length &&
      source.charCodeAt(this.index) !== 0x40 /* '@' */
    ) {
      this.advance();
    }

    if (this.index >= source.length) {
      return false;
    }

    return true;
  }
}

export default function parseDocComments(source: string): SymbolDoc {
  const comment = new DocComment(source);

  let description: string | undefined = comment.description.trim();
  if (description === "") description = undefined;

  const parameters: Array<SymbolParameterDoc> = [];
  for (const tag of comment.tags) {
    if (tag.title.toLowerCase() !== "param") continue;

    const firstSpace = tag.content.indexOf(" ");
    if (firstSpace === -1) continue;

    const name = tag.content.substr(0, firstSpace).trim();
    const description = tag.content.substr(firstSpace).trim();
    parameters.push({ description, name });
  }

  return {
    description,
    parameters
  };
}

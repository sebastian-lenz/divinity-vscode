import { Position, Range } from "vscode-languageserver";

import { DivSearchResultArgs } from "../../../shared/notifications.proposed";

export interface Preview {
  match: Range;
  text: string;
}

export default class Document {
  readonly content: string;
  readonly uri: string;
  private lineOffsets: Array<number> | null = null;

  constructor(uri: string, content: string) {
    this.uri = uri;
    this.content = content;
  }

  *search(regExp: RegExp): Iterable<DivSearchResultArgs> {
    const { content, uri } = this;
    const lineOffsets = this.getLineOffsets();
    let match: RegExpMatchArray | null;

    while ((match = regExp.exec(content))) {
      const start = this.positionAt(regExp.lastIndex - match[0].length);
      const end = this.positionAt(regExp.lastIndex);

      const lineStartOffset = lineOffsets[start.line];
      const lineEndOffset = end.line >= lineOffsets.length - 1 ? this.content.length : lineOffsets[end.line + 1];
      const previewLength = lineEndOffset - lineStartOffset;
      const text = this.content.substr(lineStartOffset, previewLength);

      const preview = {
        text,
        match: {
          end: {
            line: end.line - start.line,
            character: end.character
          },
          start: {
            line: 0,
            character: start.character
          }
        }
      };

      yield {
        preview,
        range: {
          end,
          start
        },
        uri
      };
    }
  }

  getText(range: Range | undefined): string {
    if (range) {
      var start = this.offsetAt(range.start);
      var end = this.offsetAt(range.end);
      return this.content.substring(start, end);
    }

    return this.content;
  }

  getLineOffsets() {
    if (this.lineOffsets === null) {
      const lineOffsets = [];
      const text = this.content;
      let isLineStart = true;

      for (let i = 0; i < text.length; i++) {
        if (isLineStart) {
          lineOffsets.push(i);
          isLineStart = false;
        }

        const ch = text.charAt(i);
        isLineStart = ch === "\r" || ch === "\n";

        if (ch === "\r" && i + 1 < text.length && text.charAt(i + 1) === "\n") {
          i++;
        }
      }

      if (isLineStart && text.length > 0) {
        lineOffsets.push(text.length);
      }

      this.lineOffsets = lineOffsets;
    }

    return this.lineOffsets;
  }

  positionAt(offset: number): Position {
    offset = Math.max(Math.min(offset, this.content.length), 0);
    const lineOffsets = this.getLineOffsets();
    let low = 0;
    let high = lineOffsets.length;

    if (high === 0) {
      return Position.create(0, offset);
    }

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > offset) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    // low is the least x for which the line offset is larger than the current offset
    // or array.length if no line offset is larger than the current offset
    const line = low - 1;
    return Position.create(line, offset - lineOffsets[line]);
  }

  offsetAt(position: Position): number {
    const lineOffsets = this.getLineOffsets();
    if (position.line >= lineOffsets.length) {
      return this.content.length;
    } else if (position.line < 0) {
      return 0;
    }

    const lineOffset = lineOffsets[position.line];
    const nextLineOffset =
      position.line + 1 < lineOffsets.length
        ? lineOffsets[position.line + 1]
        : this.content.length;
    return Math.max(
      Math.min(lineOffset + position.character, nextLineOffset),
      lineOffset
    );
  }
}

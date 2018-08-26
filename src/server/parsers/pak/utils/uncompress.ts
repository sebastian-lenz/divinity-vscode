/**
 * The lz4 decompressor is an adaption of the module node-lz4
 * https://github.com/pierrec/node-lz4
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2012 Pierre Curto
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export default function uncompress(
  input: Buffer,
  output: Buffer,
  sIdx?: number,
  eIdx?: number
): number {
  sIdx = sIdx || 0;
  eIdx = eIdx || input.length - sIdx;
  // Process each sequence in the incoming data
  for (var i = sIdx, n = eIdx, j = 0; i < n; ) {
    var token = input[i++];

    // Literals
    var literals_length = token >> 4;
    if (literals_length > 0) {
      // length of literals
      var l = literals_length + 240;
      while (l === 255) {
        l = input[i++];
        literals_length += l;
      }

      // Copy the literals
      var end = i + literals_length;
      while (i < end) output[j++] = input[i++];

      // End of buffer?
      if (i === n) return j;
    }

    // Match copy
    // 2 bytes offset (little endian)
    var offset = input[i++] | (input[i++] << 8);

    // 0 is an invalid offset value
    if (offset === 0 || offset > j) return -(i - 2);

    // length of match copy
    var match_length = token & 0xf;
    var l = match_length + 240;
    while (l === 255) {
      l = input[i++];
      match_length += l;
    }

    // Copy the match
    var pos = j - offset; // position of the match copy in the current output
    var end = j + match_length + 4; // minmatch = 4
    while (j < end) output[j++] = output[pos++];
  }

  return j;
}

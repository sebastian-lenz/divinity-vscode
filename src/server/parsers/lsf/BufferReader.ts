import { inflateSync } from "zlib";

import { CompressionMethod } from "./utils/compressionMethod";

export default class BufferReader {
  buffer: Buffer;
  length: number;
  offset: number = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.length = buffer.length;
  }

  readBytes(
    length: number,
    compression: CompressionMethod = CompressionMethod.None,
    compressedLength: number = 0
  ): Buffer {
    const { offset } = this;
    let result: Buffer;

    switch (compression) {
      case CompressionMethod.Zlib:
        result = inflateSync(
          this.buffer.slice(offset, offset + compressedLength)
        );
        this.offset += compressedLength;
        break;
      case CompressionMethod.None:
        result = this.buffer.slice(offset, offset + length);
        this.offset += length;
        break;
      default:
        throw new Error("Unsupported compression");
    }

    return result;
  }

  readByte() {
    const result = this.buffer[this.offset];
    this.offset += 1;
    return result;
  }

  readString(length: number) {
    const { offset } = this;
    const result = this.buffer.toString("utf-8", offset, offset + length);
    this.offset += length;
    return result;
  }

  readFloat() {
    const result = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return result;
  }

  readDouble() {
    const result = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return result;
  }

  readInt8() {
    const result = this.buffer.readInt8(this.offset);
    this.offset += 1;
    return result;
  }

  readUInt8() {
    const result = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return result;
  }

  readInt16() {
    const result = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return result;
  }

  readUInt16() {
    const result = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return result;
  }

  readInt32() {
    const result = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return result;
  }

  readUInt32() {
    const result = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return result;
  }
}

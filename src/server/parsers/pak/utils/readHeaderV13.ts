import { read } from "../../../../shared/fs";
import BufferReader from "../../lsf/BufferReader";

export interface HeaderV13 {
  version: number;
  fileListOffset: number;
  fileListSize: number;
  numParts: number;
  somePartVar: number;
  md5: number;
}

export const headerV13Size = 32;

export default async function readHeaderV13(fd: number, offset: number) {
  const buffer = Buffer.alloc(headerV13Size);
  await read(fd, buffer, 0, headerV13Size, offset);

  const reader = new BufferReader(buffer);

  return {
    version: reader.readUInt32(), // 4 bytes
    fileListOffset: reader.readUInt32(), // 4 bytes
    fileListSize: reader.readUInt32(), // 4 bytes
    numParts: reader.readUInt16(), // 2 bytes
    somePartVar: reader.readUInt16(), // 2 bytes
    md5: reader.readString(16) // 16 bytes
  };
}

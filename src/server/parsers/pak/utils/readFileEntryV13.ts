import BufferReader from "../../lsf/BufferReader";
import { PackedFile } from "../Parser";

export const fileEntryV13Size = 280;

export function readFileEntryV13(
  path: string,
  reader: BufferReader
): PackedFile {
  let name = reader.readString(256);
  for (let index = 0; index < name.length; index++) {
    if (name.charCodeAt(index) === 0) {
      name = name.substring(0, index);
      break;
    }
  }

  return {
    path,
    type: "pak",
    name,
    offsetInFile: reader.readUInt32(),
    sizeOnDisk: reader.readUInt32(),
    uncompressedSize: reader.readUInt32(),
    archivePart: reader.readUInt32(),
    flags: reader.readUInt32(),
    crc: reader.readUInt32()
  };
}

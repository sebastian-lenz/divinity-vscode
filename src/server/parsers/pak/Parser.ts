import BufferReader from "../lsf/BufferReader";
import readBlock from "./utils/readBlock";
import readHeaderV13 from "./utils/readHeaderV13";
import uncompress from "./utils/uncompress";
import { close, open, read, stat } from "../../../shared/fs";
import { fileEntryV13Size, readFileEntryV13 } from "./utils/readFileEntryV13";

export interface PackedFile {
  archivePart: number;
  crc: number;
  flags: number;
  path: string;
  name: string;
  offsetInFile: number;
  sizeOnDisk: number;
  type: "pak";
  uncompressedSize: number;
}

export default class Parser {
  protected addFileEntry(file: PackedFile) {}

  async readPackage(path: string) {
    const { size } = await stat(path);
    const buffer = Buffer.alloc(8);
    const fd = await open(path, "r");

    // Check for v13 package headers
    await read(fd, buffer, 0, 8, size - 8);
    const headerSize = buffer.readInt32LE(0);
    const signature = buffer.toString("utf-8", 4, 8);
    if (signature === "LSPK") {
      await this.readPackageV13(path, fd, size - headerSize);
    }

    await close(fd);
  }

  private async readPackageV13(path: string, fd: number, offset: number) {
    const header = await readHeaderV13(fd, offset);
    if (header.version !== 13) {
      throw new Error(
        `Unsupported package version ${
          header.version
        }; this extractor only supports 13.`
      );
    }

    const buffer = Buffer.alloc(4);
    await read(fd, buffer, 0, 4, header.fileListOffset);
    const numFiles = buffer.readInt32LE(0);

    const compressed = Buffer.alloc(header.fileListSize - 4);
    await readBlock(fd, compressed, header.fileListOffset + 4);

    const decompressed = Buffer.alloc(numFiles * fileEntryV13Size);
    uncompress(compressed, decompressed);

    const reader = new BufferReader(decompressed);
    for (let index = 0; index < numFiles; index++) {
      this.addFileEntry(readFileEntryV13(path, reader));
    }
  }
}

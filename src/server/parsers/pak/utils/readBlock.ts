import { createReadStream } from "fs";

export default async function readBlock(
  fd: number,
  buffer: Buffer,
  offset: number
): Promise<void> {
  const stream = createReadStream("", {
    fd,
    start: offset,
    end: offset + buffer.length,
    autoClose: false
  });

  let bufferOffset = 0;

  return new Promise<void>(resolve => {
    stream.on("data", (chunk: Buffer) => {
      chunk.copy(buffer, bufferOffset);
      bufferOffset += chunk.length;
    });

    stream.on("end", () => {
      resolve();
    });
  });
}

export enum CompressionMethod {
  None = 0,
  Zlib = 1,
  LZ4 = 2
}

export function CompressionFlagsToMethod(flags: number): CompressionMethod {
  switch (flags & 0x0f) {
    case 0:
      return CompressionMethod.None;

    case 1:
      return CompressionMethod.Zlib;

    case 2:
      return CompressionMethod.LZ4;

    default:
      throw new Error("Invalid compression method");
  }
}

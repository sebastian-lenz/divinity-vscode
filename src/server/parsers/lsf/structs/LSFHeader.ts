import BufferReader from "../BufferReader";

export default class LSFHeader {
  /**
   * LSOF file signature; should be the same as LSFHeader.Signature
   */
  magic: string;

  /**
   * Version of the LSOF file; D:OS EE is version 1/2, D:OS 2 is version 3
   */
  version: number;

  /**
   * Possibly version number? (major, minor, rev, build)
   */
  engineVersion: number;

  /**
   * Total uncompressed size of the string hash table
   */
  stringsUncompressedSize: number;

  /**
   * Compressed size of the string hash table
   */
  stringsSizeOnDisk: number;

  /**
   * Total uncompressed size of the node list
   */
  nodesUncompressedSize: number;

  /**
   * Compressed size of the node list
   */
  nodesSizeOnDisk: number;

  /**
   * Total uncompressed size of the attribute list
   */
  attributesUncompressedSize: number;

  /**
   * Compressed size of the attribute list
   */
  attributesSizeOnDisk: number;

  /**
   * Total uncompressed size of the raw value buffer
   */
  valuesUncompressedSize: number;

  /**
   * Compressed size of the raw value buffer
   */
  valuesSizeOnDisk: number;

  /**
   * Compression method and level used for the string, node, attribute and value buffers.
   * Uses the same format as packages (see BinUtils.MakeCompressionFlags)
   */
  compressionFlags: number;

  /**
   * Possibly unused, always 0
   */
  unknown2: number;
  unknown3: number;

  /**
   * Extended node/attribute format indicator, 0 for V2, 0/1 for V3
   */
  extended: number;

  /**
   * Required header signature.
   */
  static headerSignature = "LSOF";

  /**
   * Initial version of the LSF format
   */
  static versionInitial = 0x01;

  /**
   * LSF version that added chunked compression for substreams
   */
  static versionChunkedCompress = 0x02;

  /**
   * LSF version that extended the node descriptors
   */
  static versionExtendedNodes = 0x03;

  /**
   * Latest version supported by this library
   */
  static currentVersion = 0x03;

  constructor(reader: BufferReader) {
    this.magic = reader.readString(4);
    this.version = reader.readUInt32();
    this.engineVersion = reader.readUInt32();
    this.stringsUncompressedSize = reader.readUInt32();
    this.stringsSizeOnDisk = reader.readUInt32();
    this.nodesUncompressedSize = reader.readUInt32();
    this.nodesSizeOnDisk = reader.readUInt32();
    this.attributesUncompressedSize = reader.readUInt32();
    this.attributesSizeOnDisk = reader.readUInt32();
    this.valuesUncompressedSize = reader.readUInt32();
    this.valuesSizeOnDisk = reader.readUInt32();
    this.compressionFlags = reader.readUInt8();
    this.unknown2 = reader.readUInt8();
    this.unknown3 = reader.readUInt16();
    this.extended = reader.readUInt32();
  }

  validate(): boolean {
    return this.magic === LSFHeader.headerSignature;
  }
}

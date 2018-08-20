import BufferReader from "../BufferReader";

/**
 * V3 attribute extension in the LSF file
 */
export default class LSFAttributeEntryV3 {
  /**
   * Name of this attribute
   * (16-bit MSB: index into name hash table, 16-bit LSB: offset in hash chain)
   */
  nameHashTableIndex: number;

  /**
   * 6-bit LSB: Type of this attribute (see NodeAttribute.DataType)
   * 26-bit MSB: Length of this attribute
   */
  typeAndLength: number;

  /**
   * Index of the node that this attribute belongs to
   * Note: These indexes are assigned seemingly arbitrarily, and are not neccessarily
   * indices into the node list
   */
  nextAttributeIndex: number;

  /**
   * Absolute position of attribute value in the value stream
   */
  dataOffset: number;

  constructor(reader: BufferReader) {
    this.nameHashTableIndex = reader.readUInt32();
    this.typeAndLength = reader.readUInt32();
    this.nextAttributeIndex = reader.readInt32();
    this.dataOffset = reader.readUInt32();
  }

  /**
   * Index into name hash table
   */
  getNameIndex() {
    return this.nameHashTableIndex >> 16;
  }

  /**
   * Offset in hash chain
   */
  getNameOffset() {
    return this.nameHashTableIndex & 0xffff;
  }

  /**
   * Type of this attribute (see NodeAttribute.DataType)
   */
  getTypeId() {
    return this.typeAndLength & 0x3f;
  }

  /**
   * Length of this attribute
   */
  getLength() {
    return this.typeAndLength >> 6;
  }
}

import BufferReader from "../BufferReader";

/**
 * Node (structure) entry in the LSF file
 */
export default class LSFNodeEntryV3 {
  /**
   * Name of this node
   * (16-bit MSB: index into name hash table, 16-bit LSB: offset in hash chain)
   */
  nameHashTableIndex: number;

  /**
   * Index of the parent node
   * (-1: this node is a root region)
   */
  parentIndex: number;

  /**
   * Index of the next sibling of this node
   * (-1: this is the last node)
   */
  nextSiblingIndex: number;

  /**
   * Index of the first attribute of this node
   * (-1: node has no attributes)
   */
  firstAttributeIndex: number;

  constructor(reader: BufferReader) {
    this.nameHashTableIndex = reader.readUInt32();
    this.parentIndex = reader.readInt32();
    this.nextSiblingIndex = reader.readInt32();
    this.firstAttributeIndex = reader.readInt32();
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
}

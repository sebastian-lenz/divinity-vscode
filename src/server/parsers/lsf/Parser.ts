import BufferReader from "./BufferReader";

import Node from "./models/Node";
import Region from "./models/Region";
import Resource from "./models/Resource";
import NodeAttribute, {
  DataType,
  TranslatedFSString,
  TranslatedFSStringArgument,
  TranslatedString
} from "./models/NodeAttribute";

import LSFAttributeEntryV2 from "./structs/LSFAttributeEntryV2";
import LSFAttributeEntryV3 from "./structs/LSFAttributeEntryV3";
import LSFHeader from "./structs/LSFHeader";
import LSFNodeEntryV2 from "./structs/LSFNodeEntryV2";
import LSFNodeEntryV3 from "./structs/LSFNodeEntryV3";

import { CompressionFlagsToMethod } from "./utils/compressionMethod";
import { readAttribute } from "./utils/readAttribute";

export type NodeEntry = LSFNodeEntryV2 | LSFNodeEntryV3;
export type AttributeEntry = LSFAttributeEntryV2 | LSFAttributeEntryV3;

export default class Parser {
  /**
   * Turns on some debug console output
   */
  private debug: boolean = false;

  /**
   * Static string hash map
   */
  private names: Array<Array<string>> = [];

  /**
   * Preprocessed list of nodes (structures)
   */
  private nodes: Array<NodeEntry> = [];

  /**
   * Preprocessed list of node attributes
   */
  private attributes: Array<AttributeEntry> = [];

  read(buffer: Buffer): Resource {
    const reader = new BufferReader(buffer);
    const header = new LSFHeader(reader);
    if (!header.validate()) {
      throw new Error("Invalid LSF signature");
    }

    if (
      header.version < LSFHeader.versionInitial ||
      header.version > LSFHeader.currentVersion
    ) {
      throw new Error(`LSF version ${header.version} is not supported`);
    }

    const compression = CompressionFlagsToMethod(header.compressionFlags);

    if (header.stringsSizeOnDisk > 0 || header.stringsUncompressedSize > 0) {
      const namesStream = reader.readBytes(
        header.stringsUncompressedSize,
        compression,
        header.stringsSizeOnDisk
      );
      this.readNames(namesStream);
    }

    if (header.nodesSizeOnDisk > 0 || header.nodesUncompressedSize > 0) {
      const nodesStream = reader.readBytes(
        header.nodesUncompressedSize,
        compression,
        header.nodesSizeOnDisk
      );
      const longNodes =
        header.version >= LSFHeader.versionExtendedNodes &&
        header.extended == 1;
      this.readNodes(nodesStream, longNodes);
    }

    if (
      header.attributesSizeOnDisk > 0 ||
      header.attributesUncompressedSize > 0
    ) {
      const attributesStream = reader.readBytes(
        header.attributesUncompressedSize,
        compression,
        header.attributesSizeOnDisk
      );
      var longAttributes =
        header.version >= LSFHeader.versionExtendedNodes &&
        header.extended == 1;
      if (longAttributes) {
        this.readAttributesV3(attributesStream);
      } else {
        this.readAttributesV2(attributesStream);
      }
    }

    let values: Buffer;
    if (header.valuesSizeOnDisk > 0 || header.valuesUncompressedSize > 0) {
      var valueStream = reader.readBytes(
        header.valuesUncompressedSize,
        compression,
        header.valuesSizeOnDisk
      );
      values = valueStream;
    } else {
      values = new Buffer(0);
    }

    const resource = new Resource();
    resource.metadata.majorVersion = (header.engineVersion & 0xff000000) >> 24;
    resource.metadata.minorVersion = (header.engineVersion & 0xff0000) >> 16;
    resource.metadata.revision = (header.engineVersion & 0xff00) >> 8;
    resource.metadata.buildNumber = header.engineVersion & 0xff;

    this.readRegions(resource, values);

    return resource;
  }

  /**
   * Return the name of the given entry from the name table
   * @param entry The entry whose name should be returned
   */
  private getName(entry: AttributeEntry | NodeEntry) {
    return this.names[entry.getNameIndex()][entry.getNameOffset()];
  }

  /**
   * Reads the static string hash table from the specified stream.
   * @param buffer Stream to read the hash table from
   */
  private readNames(buffer: Buffer) {
    // Format:
    // 32-bit hash entry count (N)
    //     N x 16-bit chain length (L)
    //         L x 16-bit string length (S)
    //             [S bytes of UTF-8 string data]

    const names: Array<Array<string>> = [];
    const reader = new BufferReader(buffer);
    let numHashEntries = reader.readUInt32();

    if (this.debug) {
      console.log(" ----- DUMP OF NAME TABLE -----");
    }

    while (numHashEntries-- > 0) {
      const hash: Array<string> = [];
      names.push(hash);

      let numStrings = reader.readUInt16();
      while (numStrings-- > 0) {
        const nameLen = reader.readUInt16();
        const name = reader.readString(nameLen);
        hash.push(name);

        if (this.debug) {
          console.log(`${names.length - 1}/${hash.length - 1}: ${name}`);
        }
      }
    }

    this.names = names;
  }

  /**
   * Reads the structure headers for the LSOF resource
   * @param buffer Stream to read the node headers from
   * @param longNodes Use the long (V3) on-disk node format
   */
  private readNodes(buffer: Buffer, longNodes: boolean) {
    const nodes: Array<NodeEntry> = [];
    const reader = new BufferReader(buffer);
    let index = 0;

    if (this.debug) {
      console.log(" ----- DUMP OF NODE TABLE -----");
    }

    while (reader.offset < reader.length) {
      const pos = reader.offset;
      const resolved = longNodes
        ? new LSFNodeEntryV3(reader)
        : new LSFNodeEntryV2(reader);

      if (this.debug) {
        console.log(
          `${index}: ${this.getName(resolved)} @ ${pos} (parent ${
            resolved.parentIndex
          }, firstAttribute ${resolved.firstAttributeIndex})`
        );
      }

      nodes.push(resolved);
      index++;
    }

    this.nodes = nodes;
  }

  /**
   * Reads the V2 attribute headers for the LSOF resource
   * @param buffer Stream to read the attribute headers from
   */
  private readAttributesV2(buffer: Buffer) {
    const attributes: Array<LSFAttributeEntryV2> = [];
    const prevAttributeRefs: Array<number> = [];
    const reader = new BufferReader(buffer);
    let dataOffset = 0;
    let index = 0;

    while (reader.offset < reader.length) {
      const attribute = new LSFAttributeEntryV2(reader, dataOffset);
      const nodeIndex = attribute.nodeIndex + 1;

      if (prevAttributeRefs.length > nodeIndex) {
        if (prevAttributeRefs[nodeIndex] != -1) {
          attributes[prevAttributeRefs[nodeIndex]].nextAttributeIndex = index;
        }

        prevAttributeRefs[nodeIndex] = index;
      } else {
        while (prevAttributeRefs.length < nodeIndex) {
          prevAttributeRefs.push(-1);
        }

        prevAttributeRefs.push(index);
      }

      dataOffset += attribute.getLength();
      attributes.push(attribute);
      index++;
    }

    if (this.debug) {
      console.log(" ----- DUMP OF ATTRIBUTE REFERENCES -----");
      for (let i = 0; i < prevAttributeRefs.length; i++) {
        console.log(`Node ${i}: last attribute ${prevAttributeRefs[i]}`);
      }

      console.log(" ----- DUMP OF V2 ATTRIBUTE TABLE -----");
      for (let i = 0; i < attributes.length; i++) {
        var resolved = attributes[i];
        console.log(
          `${i}: ${this.getName(resolved)} (offset ${
            resolved.dataOffset
          }, typeId ${resolved.getTypeId()}, nextAttribute ${
            resolved.nextAttributeIndex
          }), node ${resolved.nodeIndex}`
        );
      }
    }

    this.attributes = attributes;
  }

  /**
   * Reads the V3 attribute headers for the LSOF resource
   * @param buffer Stream to read the attribute headers from
   */
  private readAttributesV3(buffer: Buffer) {
    const attributes: Array<AttributeEntry> = [];
    const reader = new BufferReader(buffer);

    while (reader.offset < reader.length) {
      attributes.push(new LSFAttributeEntryV3(reader));
    }

    if (this.debug) {
      console.log(" ----- DUMP OF V3 ATTRIBUTE TABLE -----");

      for (let i = 0; i < attributes.length; i++) {
        var attribute = attributes[i];
        console.log(
          `${i}: ${this.getName(attribute)} (offset ${
            attribute.dataOffset
          }, typeId ${attribute.getTypeId()}, nextAttribute ${
            attribute.nextAttributeIndex
          })`
        );
      }
    }

    this.attributes = attributes;
  }

  private readRegions(resource: Resource, values: Buffer) {
    const { nodes } = this;
    const reader = new BufferReader(values);
    const instances: Array<Node> = [];

    for (let i = 0; i < nodes.length; i++) {
      const entry = nodes[i];

      if (entry.parentIndex == -1) {
        const region = new Region();
        this.readNode(entry, region, reader);

        resource.regions[region.name] = region;
        instances.push(region);
      } else {
        const node = new Node();
        this.readNode(entry, node, reader);

        node.parent = instances[entry.parentIndex];
        instances.push(node);
        instances[entry.parentIndex].append(node);
      }
    }
  }

  private readNode(entry: NodeEntry, node: Node, reader: BufferReader) {
    const { attributes } = this;
    node.name = this.getName(entry);

    if (entry.firstAttributeIndex != -1) {
      let attribute = attributes[entry.firstAttributeIndex];

      while (attribute) {
        reader.offset = attribute.dataOffset;
        const value = this.readAttribute(
          attribute.getTypeId(),
          reader,
          attribute.getLength()
        );

        node.attributes[this.getName(attribute)] = value;

        if (attribute.nextAttributeIndex == -1) {
          break;
        } else {
          attribute = attributes[attribute.nextAttributeIndex];
        }
      }
    }
  }

  private readAttribute(
    type: DataType,
    reader: BufferReader,
    length: number
  ): NodeAttribute {
    // LSF and LSB serialize the buffer types differently, so specialized
    // code is added to the LSB and LSf serializers, and the common code is
    // available in BinUtils.ReadAttribute()
    switch (type) {
      case DataType.DT_String:
      case DataType.DT_Path:
      case DataType.DT_FixedString:
      case DataType.DT_LSString:
      case DataType.DT_WString:
      case DataType.DT_LSWString: {
        const attribute = new NodeAttribute(type);
        attribute.value = this.readString(reader, length);
        return attribute;
      }

      case DataType.DT_TranslatedString: {
        const attribute = new NodeAttribute(type);

        const valueLength = reader.readInt32();
        const value = this.readString(reader, valueLength);

        const handleLength = reader.readInt32();
        const handle = this.readString(reader, handleLength);

        attribute.value = new TranslatedString(value, handle);
        return attribute;
      }

      case DataType.DT_TranslatedFSString: {
        const attribute = new NodeAttribute(type);
        attribute.value = this.readTranslatedFSString(reader);
        return attribute;
      }

      case DataType.DT_ScratchBuffer: {
        const attribute = new NodeAttribute(type);
        attribute.value = reader.readBytes(length);
        return attribute;
      }

      default:
        return readAttribute(type, reader);
    }
  }

  private readTranslatedFSString(reader: BufferReader): TranslatedFSString {
    const valueLength = reader.readInt32();
    const value = this.readString(reader, valueLength);

    const handleLength = reader.readInt32();
    const handle = this.readString(reader, handleLength);

    const translatedString = new TranslatedFSString(value, handle);

    const length = reader.readInt32();
    for (let index = 0; index < length; index++) {
      const argKeyLength = reader.readInt32();
      const argKey = this.readString(reader, argKeyLength);

      const string = this.readTranslatedFSString(reader);

      const argValueLength = reader.readInt32();
      const argValue = this.readString(reader, argValueLength);

      translatedString.arguments.push(
        new TranslatedFSStringArgument(argKey, string, argValue)
      );
    }

    return translatedString;
  }

  private readString(reader: BufferReader, length: number = -1): string {
    if (length === -1) {
      const bytes: Array<string> = [];
      while (true) {
        const b = reader.readByte();
        if (b != 0) {
          bytes.push(String.fromCharCode(b));
        } else {
          break;
        }
      }

      return bytes.join("");
    }

    const string = reader.readString(length - 1);
    const nullTerminator = reader.readByte();
    if (nullTerminator != 0) {
      throw new Error("String is not null-terminated");
    }

    return string;
  }
}

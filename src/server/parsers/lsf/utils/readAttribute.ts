import * as Long from "long";

import BufferReader from "../BufferReader";
import Matrix from "../models/Matrix";
import NodeAttribute, { DataType } from "../models/NodeAttribute";

export function readAttribute(type: DataType, reader: BufferReader) {
  const attribute = new NodeAttribute(type);

  switch (type) {
    case DataType.DT_None:
      break;

    case DataType.DT_Byte:
      attribute.value = reader.readByte();
      break;

    case DataType.DT_Short:
      attribute.value = reader.readInt16();
      break;

    case DataType.DT_UShort:
      attribute.value = reader.readUInt16();
      break;

    case DataType.DT_Int:
      attribute.value = reader.readInt32();
      break;

    case DataType.DT_UInt:
      attribute.value = reader.readUInt32();
      break;

    case DataType.DT_Float:
      attribute.value = reader.readFloat();
      break;

    case DataType.DT_Double:
      attribute.value = reader.readDouble();
      break;

    case DataType.DT_IVec2:
    case DataType.DT_IVec3:
    case DataType.DT_IVec4: {
      const columns = attribute.getNumColumns();
      const vector: Array<number> = [];
      for (let index = 0; index < columns; index++) {
        vector[index] = reader.readInt32();
      }

      attribute.value = vector;
      break;
    }

    case DataType.DT_Vec2:
    case DataType.DT_Vec3:
    case DataType.DT_Vec4: {
      const columns = attribute.getNumColumns();
      const vector: Array<number> = [];
      for (let index = 0; index < columns; index++) {
        vector[index] = reader.readFloat();
      }

      attribute.value = vector;
      break;
    }

    case DataType.DT_Mat2:
    case DataType.DT_Mat3:
    case DataType.DT_Mat3x4:
    case DataType.DT_Mat4x3:
    case DataType.DT_Mat4: {
      const columns = attribute.getNumColumns();
      const rows = attribute.getNumRows();
      const matrix = new Matrix(rows, columns);
      matrix.each((value, row, column) => {
        matrix.values[row][column] = reader.readFloat();
      });

      attribute.value = matrix;
      break;
    }

    case DataType.DT_Bool:
      attribute.value = reader.readByte() != 0;
      break;

    case DataType.DT_ULongLong:
      attribute.value = new Long(reader.readInt32(), reader.readInt32(), true);
      break;

    case DataType.DT_Long:
      attribute.value = new Long(reader.readInt32(), reader.readInt32());
      break;

    case DataType.DT_Int8:
      attribute.value = reader.readInt8();
      break;

    case DataType.DT_UUID:
      attribute.value = reader.readString(16);
      break;

    default:
      // Strings are serialized differently for each file format and should be
      // handled by the format-specific ReadAttribute()
      throw new Error(`ReadAttribute() not implemented for type ${type}`);
  }

  return attribute;
}

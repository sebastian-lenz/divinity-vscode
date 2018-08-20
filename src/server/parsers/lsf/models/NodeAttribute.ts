import * as Long from "long";

import Matrix from "./Matrix";

export enum DataType {
  DT_None = 0,
  DT_Byte = 1,
  DT_Short = 2,
  DT_UShort = 3,
  DT_Int = 4,
  DT_UInt = 5,
  DT_Float = 6,
  DT_Double = 7,
  DT_IVec2 = 8,
  DT_IVec3 = 9,
  DT_IVec4 = 10,
  DT_Vec2 = 11,
  DT_Vec3 = 12,
  DT_Vec4 = 13,
  DT_Mat2 = 14,
  DT_Mat3 = 15,
  DT_Mat3x4 = 16,
  DT_Mat4x3 = 17,
  DT_Mat4 = 18,
  DT_Bool = 19,
  DT_String = 20,
  DT_Path = 21,
  DT_FixedString = 22,
  DT_LSString = 23,
  DT_ULongLong = 24,
  DT_ScratchBuffer = 25,
  DT_Long = 26,
  DT_Int8 = 27,
  DT_TranslatedString = 28,
  DT_WString = 29,
  DT_LSWString = 30,
  DT_UUID = 31,
  DT_Unknown32 = 32,
  DT_TranslatedFSString = 33,
  // Last supported datatype, always keep this one at the end
  DT_Max = DT_TranslatedFSString
}

export type AttributeValueType =
  | boolean
  | number
  | string
  | undefined
  | Array<number>
  | Buffer
  | Long
  | Matrix
  | TranslatedString;

export class TranslatedString {
  handle: string;
  value: string;

  constructor(value: string, handle: string) {
    this.value = value;
    this.handle = handle;
  }
}

export class TranslatedFSStringArgument {
  key: string;
  string: TranslatedFSString;
  value: string;

  constructor(key: string, string: TranslatedFSString, value: string) {
    this.key = key;
    this.string = string;
    this.value = value;
  }
}

export class TranslatedFSString extends TranslatedString {
  arguments: Array<TranslatedFSStringArgument> = [];
}

export default class NodeAttribute {
  type: DataType;
  value: AttributeValueType;

  constructor(type: DataType) {
    this.type = type;
  }

  getNumRows(): number {
    switch (this.type) {
      case DataType.DT_IVec2:
      case DataType.DT_IVec3:
      case DataType.DT_IVec4:
      case DataType.DT_Vec2:
      case DataType.DT_Vec3:
      case DataType.DT_Vec4:
        return 1;

      case DataType.DT_Mat2:
        return 2;

      case DataType.DT_Mat3:
      case DataType.DT_Mat3x4:
        return 3;

      case DataType.DT_Mat4x3:
      case DataType.DT_Mat4:
        return 4;

      default:
        return 0;
    }
  }

  getNumColumns(): number {
    switch (this.type) {
      case DataType.DT_IVec2:
      case DataType.DT_Vec2:
      case DataType.DT_Mat2:
        return 2;

      case DataType.DT_IVec3:
      case DataType.DT_Vec3:
      case DataType.DT_Mat3:
      case DataType.DT_Mat4x3:
        return 3;

      case DataType.DT_IVec4:
      case DataType.DT_Vec4:
      case DataType.DT_Mat3x4:
      case DataType.DT_Mat4:
        return 4;

      default:
        return 0;
    }
  }

  isNumeric() {
    return (
      this.type == DataType.DT_Byte ||
      this.type == DataType.DT_Short ||
      this.type == DataType.DT_Int ||
      this.type == DataType.DT_UInt ||
      this.type == DataType.DT_Float ||
      this.type == DataType.DT_Double ||
      this.type == DataType.DT_ULongLong ||
      this.type == DataType.DT_Long ||
      this.type == DataType.DT_Int8
    );
  }
}

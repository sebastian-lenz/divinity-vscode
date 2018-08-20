export default class Matrix {
  numColumns: number;
  numRows: number;
  values: Array<Array<number>>;

  constructor(numRows: number, numColumns: number) {
    const values: Array<Array<number>> = [];

    for (let y = 0; y < numRows; y++) {
      const row = [];
      for (let x = 0; x < numColumns; x++) {
        row.push(0);
      }

      values.push(row);
    }

    this.numColumns = numColumns;
    this.numRows = numRows;
    this.values = values;
  }

  each(callback: (value: number, row: number, column: number) => void) {
    const { numColumns, numRows, values } = this;

    for (let row = 0; row < numRows; row++) {
      for (let column = 0; column < numColumns; column++) {
        callback(values[row][column], row, column);
      }
    }
  }
}

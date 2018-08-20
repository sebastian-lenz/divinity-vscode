const assert = require("assert");
const fs = require("fs");

const { default: LSFReader } = require("../lib/server/parsers/lsf/Parser");

describe("LSF parser", function() {
  it("reads a lsf file", function() {
    const buffer = fs.readFileSync("test/fixtures/object.lsf");
    const parser = new LSFReader();
    parser.read(buffer);
  });
});

const assert = require("assert");
const fs = require("fs");

const {
  default: HeaderParser
} = require("../lib/server/parsers/story/HeaderParser");

const {
  default: GoalParser
} = require("../lib/server/parsers/story/GoalParser");

function load(filename) {
  return fs.readFileSync("test/fixtures/" + filename, "utf-8");
}

function saveJson(filename, data) {
  fs.writeFileSync("test/fixtures/" + filename, JSON.stringify(data, null, 2), {
    encoding: "utf-8"
  });
}

describe("Story parser", function() {
  it("creates tokens from script files", function() {
    const parser = new GoalParser(load("simple.txt"));
    const nodes = parser.tokenize();
    // saveJson("simple-tokens.json", nodes);
  });
  it("parses simple sory script", function() {
    const parser = new GoalParser(load("simple.txt"));
    const nodes = parser.parse();
    // saveJson("simple-nodes.json", nodes);
  });
  it("parses stroy div", function() {
    const parser = new HeaderParser(load("headers.div"));
    const nodes = parser.parse();
    // saveJson("headers.json", nodes);
  });
});

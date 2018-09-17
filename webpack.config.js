const path = require("path");

module.exports = {
  mode: "production",
  entry: {
    client: "./lib/client/index.js",
    server: "./lib/server/index.js"
  },
  output: {
    path: path.resolve(__dirname, "lib"),
    filename: "[name]/index.js",
    libraryTarget: "commonjs"
  },
  target: "node",
  node: false,
  externals: {
    vscode: "commonjs vscode",
    "vscode-languageserver": "commonjs vscode-languageserver",
    "vscode-languageclient": "commonjs vscode-languageclient"
  }
};

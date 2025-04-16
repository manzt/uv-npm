// Adapted from https://github.com/ast-grep/ast-grep/blob/96f5500/npm/postinstall.js
let fs = require("node:fs");
let path = require("node:path");
let process = require("node:process");

let binary = process.platform === "win32" ? "uv.exe" : "uv";
let pkgPath = path.dirname(
  require.resolve(`@manzt/uv-${process.platform}-${process.arch}/package.json`),
);

try {
  fs.linkSync(
    path.join(pkgPath, "bin", binary),
    path.join(__dirname, "bin", binary),
  );
} catch (err) {
  try {
    fs.copyFileSync(
      path.join(pkgPath, "bin", binary),
      path.join(__dirname, "bin", binary),
    );
  } catch (err) {
    console.error("Failed to move @manzt/uv binary into place.");
    process.exit(1);
  }
}

if (process.platform === "win32") {
  try {
    fs.unlinkSync(path.join(__dirname, "bin", "uv"));
  } catch (err) {}
}

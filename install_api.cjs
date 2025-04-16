let fs = require("node:fs");
let process = require("node:process");
let path = require("node:path");

module.exports = {
  runInstall() {
    let binary = process.platform === "win32" ? "uv.exe" : "uv";
    let pkgPath = path.dirname(
      require.resolve(
        `@manzt/uv-${process.platform}-${process.arch}/package.json`,
      ),
    );
    hardLinkOrCopy(
      path.join(pkgPath, "bin", binary),
      path.join(__dirname, binary),
    );
    if (process.platform !== "win32") {
      chmodX(path.join(__dirname, binary));
    }
  },
};

/** @param {string} filePath */
function chmodX(filePath) {
  let perms = fs.statSync(filePath).mode;
  fs.chmodSync(filePath, perms | 0o111);
}

/**
 * @param sourcePath {string}
 * @param destinationPath {string}
 */
function hardLinkOrCopy(sourcePath, destinationPath) {
  try {
    fs.linkSync(sourcePath, destinationPath);
  } catch {
    atomicCopyFile(sourcePath, destinationPath);
  }
}

/**
 * @param sourcePath {string}
 * @param destinationPath {string}
 */
function atomicCopyFile(sourcePath, destinationPath) {
  let crypto = require("node:crypto");
  let rand = crypto.randomBytes(4).toString("hex");
  let tempFilePath = destinationPath + "." + rand;
  fs.copyFileSync(sourcePath, tempFilePath);
  try {
    fs.renameSync(tempFilePath, destinationPath);
  } catch (err) {
    // will maybe throw when another process had already done this
    // so just ignore and delete the created temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (_err2) {
      // ignore
    }
    throw err;
  }
}

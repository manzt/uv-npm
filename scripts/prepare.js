import * as fs from "node:fs";
import * as path from "node:path";
import * as stream from "node:stream";
import * as zlib from "node:zlib";

import tar from "tar";
import INFO from "../package.json" with { type: "json" };

/**
 * Make an assertion.
 *
 * @param {unknown} expression - The expression to test.
 * @param {string=} msg - The optional message to display if the assertion fails.
 * @returns {asserts expression}
 * @throws an {@link Error} if `expression` is not truthy.
 */
export function assert(expression, msg = "") {
  if (!expression) throw new Error(msg);
}

/**
 * Get the binary name for a platform
 *
 * @param {{ platform: string }} options
 */
function getBinaryName({ platform }) {
  return "uv" + (platform === "win32" ? ".exe" : "");
}

/**
 * Download a binary from GitHub
 *
 * @param {string} tmpDir
 * @param {Package} pkg
 * @param {string} uvVersion - uv version
 */
async function downloadBinary(tmpDir, pkg, uvVersion) {
  let binName = getBinaryName(pkg);
  let archiveFile = path.join(tmpDir, pkg.artifact);
  let { url, isZip } = pkg.downloadInfo(uvVersion);

  console.log(`Downloading uv binary from ${url}...`);
  let response = await fetch(url);
  assert(
    response.ok && response.body,
    `Failed to download binary: ${response.status}`,
  );

  await stream.promises.pipeline(
    stream.Readable.fromWeb(
      // @ts-expect-error - Node types issue
      response.body,
    ),
    fs.createWriteStream(archiveFile),
  );

  // Extract binary from archive
  if (isZip) {
    // For Windows .zip files
    const extract = await import("extract-zip");
    await extract.default(archiveFile, { dir: tmpDir });
  } else {
    // For .tar.gz files
    await stream.promises.pipeline(
      fs.createReadStream(archiveFile),
      zlib.createGunzip(),
      tar.x({ C: tmpDir, strip: 1 }),
    );
  }

  return binName;
}

/**
 * Prepare a platform-specific package
 *
 * @param {Package} pkg
 * @param {Object} options
 * @param {string} options.uvVersion
 * @param {string} options.downloadDir
 */
async function preparePackage(pkg, { downloadDir, uvVersion }) {
  console.log(`Preparing ${pkg.name}...`);
  let packageDir = path.join(import.meta.dirname, "..", "platforms", pkg.key);
  let binDir = path.join(packageDir, "bin");
  fs.promises.mkdir(binDir, { recursive: true });

  let binaryName = await downloadBinary(downloadDir, pkg, uvVersion);
  let extractedBinary;
  if (pkg.platform === "win32") {
    extractedBinary = path.join(downloadDir, binaryName);
  } else {
    // For tar.gz files, the binary is typically inside a "uv" directory
    extractedBinary = path.join(downloadDir, "uv", binaryName);
    if (!fs.existsSync(extractedBinary)) {
      extractedBinary = path.join(downloadDir, binaryName);
    }
  }

  assert(
    fs.existsSync(extractedBinary),
    `Could not find binary in extracted archive at ${extractedBinary}`,
  );

  let targetBinary = path.join(binDir, binaryName);
  fs.copyFileSync(extractedBinary, targetBinary);
  fs.chmodSync(targetBinary, 0o755); // Ensure executable

  await Promise.all([
    fs.promises.writeFile(
      path.join(packageDir, "package.json"),
      JSON.stringify(
        {
          "name": pkg.name,
          "version": INFO.version,
          "description": INFO.description,
          "os": [pkg.platform],
          "cpu": [pkg.arch],
          "license": "MIT",
          "engines": { "node": ">= 14" },
          "repository": "https://github.com/manzt/@manzt-uv",
          "publishConfig": {
            "registry": "https://registry.npmjs.org/",
            "access": "public",
          },
        },
        null,
        2,
      ),
    ),
    fs.promises.writeFile(
      path.join(packageDir, "README.md"),
      `# ${pkg.name}
This is the **${
        pkg.artifact.replace("uv-", "").replace(".tar.gz", "").replace(
          ".zip",
          "",
        )
      }** binary for @manzt/uv
`,
    ),
  ]);

  console.log(`Binary package for ${pkg.key} prepared successfully`);
}

class Package {
  /**
   * @param {object} options
   * @param {string} options.platform
   * @param {string} options.arch
   * @param {string} options.artifact
   */
  constructor({ arch, platform, artifact }) {
    this.arch = arch;
    this.platform = platform;
    this.artifact = artifact;
  }
  get key() {
    return `${this.platform}-${this.arch}`;
  }
  get name() {
    return `@manzt/uv-${this.key}`;
  }
  /**
   * @param {string} version
   * @returns {{ url: string, isZip: boolean }}
   */
  downloadInfo(version) {
    return {
      url:
        `https://github.com/astral-sh/uv/releases/download/${version}/${this.artifact}`,
      isZip: this.artifact.endsWith(".zip"),
    };
  }
}

/**
 * @param {Array<Package>} packages
 */
async function updateOptionalDependencies(packages) {
  let packageJsonPath = path.resolve(import.meta.dirname, "..", "package.json");
  /** @type {typeof INFO} */
  let packageJson = {
    ...JSON.parse(await fs.promises.readFile(packageJsonPath, "utf8")),
    optionalDependencies: Object.fromEntries(
      packages.map((pkg) => [pkg.name, INFO.version]),
    ),
  };
  await fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
  );
  console.log("Updated optionalDependencies in package.json");
}

async function main() {
  let uvVersion = "0.6.14";
  let downloadDir = path.resolve(import.meta.dirname, "..", ".tmp");
  await fs.promises.mkdir(downloadDir, { recursive: true });

  const packages = [
    // Darwin (macOS)
    new Package({
      platform: "darwin",
      arch: "x64",
      artifact: "uv-x86_64-apple-darwin.tar.gz",
    }),
    new Package({
      platform: "darwin",
      arch: "arm64",
      artifact: "uv-aarch64-apple-darwin.tar.gz",
    }),

    // Linux GNU
    new Package({
      platform: "linux",
      arch: "x64",
      artifact: "uv-x86_64-unknown-linux-gnu.tar.gz",
    }),
    new Package({
      platform: "linux",
      arch: "arm64",
      artifact: "uv-aarch64-unknown-linux-gnu.tar.gz",
    }),

    // Windows
    new Package({
      platform: "win32",
      arch: "x64",
      artifact: "uv-x86_64-pc-windows-msvc.zip",
    }),
    new Package({
      platform: "win32",
      arch: "ia32",
      artifact: "uv-i686-pc-windows-msvc.zip",
    }),
    new Package({
      platform: "win32",
      arch: "arm64",
      artifact: "uv-aarch64-pc-windows-msvc.zip",
    }),
  ];

  // Update optionalDependencies in main package.json
  await updateOptionalDependencies(packages);

  for (let pkg of packages) {
    await preparePackage(pkg, { uvVersion, downloadDir });
  }
}

main();

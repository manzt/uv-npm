import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

import { assert } from "./prepare.js";

/**
 * Publishes a package with npm
 *
 * @param {string} packageDir - Path to the package directory
 * @param {object} options
 * @param {boolean} options.dryRun - Whether to do a dry run
 */
function publishPackage(packageDir, { dryRun = false }) {
  let pkg = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  console.log(`Publishing ${pkg.name}...`);
  execSync(`pnpm publish --no-git-checks ${dryRun ? "--dry-run" : ""}`, {
    cwd: packageDir,
    stdio: "inherit",
  });
}

async function main() {
  let rootDir = path.resolve(import.meta.dirname, "..");
  let platformsDir = path.join(rootDir, "platforms");
  let dryRun = process.argv.includes("--dry-run");
  for (let platform of fs.readdirSync(platformsDir)) {
    let platformDir = path.join(platformsDir, platform);
    assert(fs.statSync(platformDir).isDirectory(), `Missing ${platformsDir}`);
    publishPackage(platformDir, { dryRun });
  }
  publishPackage(rootDir, { dryRun });
}

main();

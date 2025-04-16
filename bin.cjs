#!/usr/bin/env node
let child_process = require("node:child_process");
let fs = require("node:fs");
let path = require("node:path");
let process = require("node:process");

run(
  path.join(__dirname, process.platform === "win32" ? "uv.exe" : "uv"),
);

/** @param {string} exePath */
function run(exePath) {
  if (!fs.existsSync(exePath)) {
    require("./install_api.cjs").runInstall();
  }

  let result = child_process.spawnSync(
    exePath,
    process.argv.slice(2),
    { stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? undefined;
}

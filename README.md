# @manzt/uv

[![npm version](https://img.shields.io/npm/v/%40manzt%2Fuv)](https://www.npmjs.com/package/@manzt/uv)

This repo mirrors [uv](https://github.com/astral-sh/uv) GitHub releases to npm,
letting you run Astral’s fast Python package manager via JavaScript package
managers — no install needed.

## Usage

Run `uv` via the npm CLI:

```sh
npx @manzt/uv --help
# An extremely fast Python package manager.
#
# Usage: uv [OPTIONS] <COMMAND>
```

Or with one of several other JavaScript package managers:

```bash
# pnpm
pnpx @manzt/uv --help # [pnpm docs](https://pnpm.io/cli/dlx)

# bun
bunx @manzt/uv --help # [bun docs](https://bun.sh/docs/cli/bunx)
```

See uv's [documentation](https://docs.astral.sh/uv/) and
[repository](https://github.com/astral-sh/uv) for more information.

### Example

```sh
npx @manzt/uv init --script foo.py
npx @manzt/uv add --script foo.py rich
echo 'from rich import print; print("[bold green]Hello uv![/bold green]")' >> foo.py
npx @manzt/uv run foo.py
```

## Why?

JavaScript developers like to dunk on Python packaging. Python folks dunk on
JavaScript. It's silly. Both ecosystems have evolved since you last looked.

IMO [uv](https://github.com/astral-sh/uv) has fixed Python packaging, and this
project is an attempt to make that more accessible to JavaScript folks. I also
wanted to learn a bit about how the distribution of binaries works on npm.

## License

MIT

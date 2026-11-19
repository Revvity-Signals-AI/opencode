#!/usr/bin/env bash
# Build the Revvity OpenCode binary for this machine, and optionally install it.
#
#   revvity/build.sh              build only; prints the binary path
#   revvity/build.sh --install    build, then replace ~/.opencode/bin/opencode
#                                 (the first install keeps the stock binary as opencode.stock)
#
# The version is "<upstream tag>-revvity.<n>", e.g. 2.1.2-revvity.1. Set REVVITY_BUILD to bump <n>.
# Channel "revvity" keeps it distinguishable from upstream releases in `opencode --version` and logs.
set -euo pipefail

root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
base=$(git -C "$root" describe --tags --abbrev=0 --match 'v[0-9]*')
version="${base#v}-revvity.${REVVITY_BUILD:-1}"
export PATH="$HOME/.bun/bin:$PATH"
# Upstream's `prepare` script installs husky, which sets a repo-local core.hooksPath and
# silently replaces the developer's global git hooks. Never let it.
export HUSKY=0

case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) target=cli-darwin-arm64 ;;
  Darwin-x86_64) target=cli-darwin-x64 ;;
  Linux-aarch64) target=cli-linux-arm64 ;;
  Linux-x86_64) target=cli-linux-x64 ;;
  *) echo "unsupported platform $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac

required=$(sed -n 's/.*"packageManager": "bun@\([^"]*\)".*/\1/p' "$root/package.json")
if [[ "$(bun --version 2>/dev/null)" != "$required" ]]; then
  echo "bun $required required (found: $(bun --version 2>/dev/null || echo none))." >&2
  echo "Install: curl -fsSL https://bun.sh/install | bash -s bun-v$required" >&2
  exit 1
fi

echo "Building OpenCode $version ($target)"
(cd "$root" && bun install --frozen-lockfile)
(cd "$root/packages/cli" && OPENCODE_VERSION="$version" OPENCODE_CHANNEL=revvity bun run build --single)
binary="$root/packages/cli/dist/$target/bin/opencode"
"$binary" --version

if [[ "${1:-}" == "--install" ]]; then
  dest="$HOME/.opencode/bin/opencode"
  mkdir -p "$(dirname "$dest")"
  if [[ -e "$dest" && ! -e "$dest.stock" ]] && ! "$dest" --version 2>/dev/null | grep -q revvity; then
    cp -p "$dest" "$dest.stock"
    echo "Kept the stock binary as $dest.stock"
  fi
  cp "$binary" "$dest.new" && mv "$dest.new" "$dest"
  echo "Installed $("$dest" --version) to $dest"
  echo 'Make sure "autoupdate": false is set in ~/.config/opencode/opencode.jsonc, or an update will replace this build.'
fi

#!/usr/bin/env bash
# Build the Revvity OpenCode binary for this machine, and optionally install it.
#
#   revvity/build.sh              build only; prints the binary path
#   revvity/build.sh --install    build, replace ~/.opencode/bin/opencode, and turn OpenCode's auto-update off
#                                 (the first install keeps the stock binary as opencode.stock)
#
# The version is "<upstream version>-revvity.<n>", e.g. 2.3.2-revvity.1. Set REVVITY_BUILD to bump <n>.
# Channel "revvity" keeps it distinguishable from upstream releases in `opencode --version` and logs.
set -euo pipefail

root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
# The upstream version comes from the CLI package, not `git describe`: upstream tags each release on a
# version-bump commit off `dev`, so after merging a new release the nearest tag can still be the old one.
upstream=$(sed -n 's/^  "version": "\([^"]*\)".*/\1/p' "$root/packages/cli/package.json")
version="${upstream}-revvity.${REVVITY_BUILD:-1}"
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

  # An update would replace this build with a stock release.
  bun "$root/revvity/autoupdate.ts"

  # The official installer puts OpenCode in ~/.opencode/bin. A Homebrew or npm copy earlier on PATH would keep
  # running the stock build.
  found=$(command -v opencode || true)
  if [[ -z "$found" ]]; then
    echo >&2
    echo "WARNING: 'opencode' is not on your PATH. Add this to your shell profile (~/.zshrc):" >&2
    echo "  export PATH=\"\$HOME/.opencode/bin:\$PATH\"" >&2
    exit 2
  fi
  if [[ "$(cd "$(dirname "$found")" && pwd -P)/$(basename "$found")" != "$(cd "$(dirname "$dest")" && pwd -P)/opencode" ]]; then
    echo >&2
    echo "WARNING: 'opencode' on your PATH is $found ($("$found" --version 2>/dev/null || echo unknown)), not $dest." >&2
    echo "That copy stays stock. Uninstall it with the package manager that installed it (e.g. brew), or put" >&2
    echo "  export PATH=\"\$HOME/.opencode/bin:\$PATH\"" >&2
    echo "at the end of your shell profile (~/.zshrc) and open a new terminal." >&2
    exit 2
  fi
  echo "OK: 'opencode' on your PATH is the Revvity build. Restart any open OpenCode windows."
fi

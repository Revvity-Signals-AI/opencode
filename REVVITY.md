# Revvity OpenCode build

This fork carries a small patch set on top of upstream OpenCode releases. It is
built locally; nothing here is published.

| Branch | What |
| --- | --- |
| `revvity` | Upstream release tag + our patches. What we build and run. |
| `dev` | Untouched mirror of upstream `dev`. |

## Patches

1. **`feat(tui): plugin API to insert text into the prompt`** — adds
   `ui.prompt.{available,focused,text,insert}` to the TUI plugin context.
   `insert()` returns a handle whose `update()` rewrites only the text it
   inserted. Used by
   [revvity-signals-opencode-voice](https://github.com/Revvity-Signals-AI/revvity-signals-opencode-voice)
   for hold-space dictation. Candidate for upstreaming.
2. **`build: Revvity build and install script, fork notes`** — this file and
   `revvity/build.sh`. Touches nothing upstream owns.

Use exactly the Bun version the release pins (`packageManager` in
`package.json`); `build.sh` refuses any other. With a different Bun,
`bun install` fails applying `patches/@silvia-odwyer%2Fphoton-node@0.3.4.patch`.

## Build and install

Requires the Bun version pinned in `package.json` (`packageManager`).

```bash
revvity/build.sh --install   # builds <tag>-revvity.N and replaces ~/.opencode/bin/opencode
```

The first install keeps the stock binary as `~/.opencode/bin/opencode.stock`
(`mv` it back to undo). Set `"autoupdate": false` in
`~/.config/opencode/opencode.jsonc`, otherwise OpenCode's updater will replace
the build with a stock release.

## Moving to a new upstream release

```bash
git fetch upstream --tags
git rebase --onto v2.2.0 v2.1.2 revvity    # old tag -> new tag
cd packages/tui && bun test test/plugin-prompt.test.tsx
revvity/build.sh --install
```

Then open a PR for the rebased branch so the change is reviewed like any other.

## CI

None, deliberately. This fork is public (a fork of a public repo must be), and
public repos may not use the org's self-hosted runner. GitHub Actions is
disabled on the fork so upstream's workflows do not run here.

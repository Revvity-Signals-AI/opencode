# Revvity OpenCode build

This fork carries a small patch set on top of upstream OpenCode releases. It is
built locally; nothing here is published. Setting up voice dictation? Follow the
setup guide in
[revvity-signals-opencode-voice](https://github.com/Revvity-Signals-AI/revvity-signals-opencode-voice#setup);
it covers this build.

| Branch | What |
| --- | --- |
| `revvity` | Latest upstream release we run, plus our patches. What we build and run. |
| `dev` | Untouched mirror of upstream `dev`. |

`git diff <release tag> revvity` shows exactly our patches.

## Patches

1. **`feat(tui): plugin API to insert text into the prompt`**: adds
   `ui.prompt.{available,focused,text,insert}` to the TUI plugin context.
   `insert()` returns a handle whose `update()` rewrites only the text it
   inserted. Used by
   [revvity-signals-opencode-voice](https://github.com/Revvity-Signals-AI/revvity-signals-opencode-voice)
   for hold-space dictation. Proposed upstream in
   [anomalyco/opencode#51209](https://github.com/anomalyco/opencode/issues/51209).
2. **Build tooling**: this file and `revvity/` (`build.sh`, `autoupdate.ts`
   and its test). Touches nothing upstream owns.

## Build and install

Requires exactly the Bun version pinned in `package.json` (`packageManager`);
`build.sh` refuses any other and prints the install command. With a different
Bun, `bun install` can fail applying the patches under `patches/`.

```bash
revvity/build.sh --install
```

This builds `<upstream version>-revvity.N` and replaces `~/.opencode/bin/opencode`.
The first install keeps the stock binary as `~/.opencode/bin/opencode.stock`
(`mv` it back to undo). It then:

- turns OpenCode's auto-update off in your global config
  (`revvity/autoupdate.ts`, which keeps comments and backs the file up), since
  an update would replace this build with a stock release;
- checks that the `opencode` on your PATH is the one it installed, and exits 2
  with instructions if a Homebrew or npm copy comes first.

## Moving to a new upstream release

`revvity` moves forward by **merge**, never by rebase or force-push: people
pull this branch. Upstream tags each release on a version-bump commit off
`dev`, so every `package.json` version line conflicts. Take the release's side
for all of those; only our patch files need real resolution.

```bash
git fetch upstream --tags
git worktree add ~/wt/<issue> -b <issue> origin/revvity
cd ~/wt/<issue>
git merge vNEW
#   version-only conflicts:  git checkout --theirs -- <file> && git add <file>
#   deleted upstream (UD):   git rm <file>
#   our files:               resolve by hand
git diff --stat vNEW          # must list only the patch files above
(cd packages/tui && bun test test/plugin-prompt.test.tsx && bun run typecheck)
bun test ./revvity/autoupdate.test.ts
revvity/build.sh --install
```

Then open a PR into `revvity` and merge it with a merge commit (not rebase or
squash), so the upstream history stays intact.

If the shared clone is a partial clone (`--filter=blob:none`), set
`git config remote.upstream.promisor true` first; otherwise the merge fails
fetching upstream blobs from the fork.

## CI

None, deliberately. This fork is public (a fork of a public repo must be), and
public repos may not use the org's self-hosted runner. GitHub Actions is
disabled on the fork so upstream's workflows do not run here.

// Turns off OpenCode's updater in the global config, so an update cannot replace the Revvity build.
//
//   bun revvity/autoupdate.ts            uses $XDG_CONFIG_HOME/opencode or ~/.config/opencode
//
// The updater reads config.json, opencode.json and opencode.jsonc in that order, and the last file that sets a
// policy wins; within a file, "update" beats "autoupdate" (packages/cli/src/services/updater.ts, readPolicy and
// decodePolicy). So the setting goes into the last existing file, under the key that file already uses, with
// comments and formatting preserved. A file is backed up before it is changed.
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { homedir } from "node:os"
import path from "node:path"

const require = createRequire(path.join(import.meta.dir, "../packages/cli/package.json"))
const jsonc: typeof import("jsonc-parser") = require("jsonc-parser")

const FILES = ["config.json", "opencode.json", "opencode.jsonc"]

export type Result = { file: string; changed: boolean; backup?: string }

export function disableUpdates(dir: string, stamp = new Date().toISOString().replace(/[:.]/g, "-")): Result {
  const existing = FILES.map((name) => path.join(dir, name)).filter((file) => existsSync(file))
  const file = existing.at(-1) ?? path.join(dir, "opencode.jsonc")
  const text = existsSync(file) ? readFileSync(file, "utf8") : "{}\n"
  const errors: import("jsonc-parser").ParseError[] = []
  const input = jsonc.parse(text, errors, { allowTrailingComma: true })
  if (errors.length || typeof input !== "object" || input === null || Array.isArray(input))
    throw new Error(`${file} is not a JSON object; set "autoupdate": false in it by hand`)
  const [key, value] = "update" in input ? ["update", "disable"] : ["autoupdate", false]
  if (input[key] === value) return { file, changed: false }
  const edits = jsonc.modify(text, [key], value, { formattingOptions: { insertSpaces: true, tabSize: 2 } })
  let backup: string | undefined
  if (existsSync(file)) {
    backup = `${file}.bak-${stamp}`
    copyFileSync(file, backup)
  }
  mkdirSync(dir, { recursive: true })
  writeFileSync(file, jsonc.applyEdits(text, edits))
  return { file, changed: true, backup }
}

if (import.meta.main) {
  const dir = path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "opencode")
  const result = disableUpdates(dir)
  if (!result.changed) console.log(`Auto-update already off in ${result.file}`)
  else console.log(`Turned auto-update off in ${result.file}${result.backup ? ` (backup: ${result.backup})` : ""}`)
}

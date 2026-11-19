import { afterEach, beforeEach, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { decodePolicy } from "../packages/cli/src/services/updater"
import { disableUpdates } from "./autoupdate"

let dir: string
beforeEach(() => (dir = mkdtempSync(path.join(tmpdir(), "revvity-autoupdate-"))))
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const read = (name: string) => readFileSync(path.join(dir, name), "utf8")

test("creates opencode.jsonc when there is no config", () => {
  const result = disableUpdates(dir, "t")
  expect(result).toEqual({ file: path.join(dir, "opencode.jsonc"), changed: true, backup: undefined })
  expect(decodePolicy(read("opencode.jsonc"))).toBe("disable")
})

test("keeps comments and other settings, and backs the file up", () => {
  const original = '{\n  // my model\n  "model": "x",\n}\n'
  writeFileSync(path.join(dir, "opencode.jsonc"), original)
  const result = disableUpdates(dir, "t")
  expect(result.backup).toBe(path.join(dir, "opencode.jsonc.bak-t"))
  expect(readFileSync(result.backup!, "utf8")).toBe(original)
  const text = read("opencode.jsonc")
  expect(text).toContain("// my model")
  expect(text).toContain('"model": "x"')
  expect(decodePolicy(text)).toBe("disable")
})

test("writes to the file the updater reads last", () => {
  writeFileSync(path.join(dir, "config.json"), '{ "autoupdate": true }')
  writeFileSync(path.join(dir, "opencode.json"), '{ "model": "x" }')
  expect(disableUpdates(dir, "t").file).toBe(path.join(dir, "opencode.json"))
  expect(decodePolicy(read("opencode.json"))).toBe("disable")
  expect(existsSync(path.join(dir, "opencode.jsonc"))).toBe(false)
})

test('an existing "update" key is changed rather than shadowed', () => {
  writeFileSync(path.join(dir, "opencode.jsonc"), '{ "update": "auto" }')
  disableUpdates(dir, "t")
  expect(decodePolicy(read("opencode.jsonc"))).toBe("disable")
})

test("already off is left alone", () => {
  writeFileSync(path.join(dir, "opencode.jsonc"), '{ "autoupdate": false }')
  expect(disableUpdates(dir, "t")).toEqual({ file: path.join(dir, "opencode.jsonc"), changed: false })
  expect(existsSync(path.join(dir, "opencode.jsonc.bak-t"))).toBe(false)
})

test("an unparseable file is refused, not overwritten", () => {
  writeFileSync(path.join(dir, "opencode.jsonc"), "{ nope")
  expect(() => disableUpdates(dir, "t")).toThrow("not a JSON object")
  expect(read("opencode.jsonc")).toBe("{ nope")
})

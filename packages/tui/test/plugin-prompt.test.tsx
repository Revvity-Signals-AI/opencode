import { beforeEach, expect, test } from "bun:test"
import { takeDraft } from "../src/component/prompt/draft-stash"
import { createAppFixture } from "./fixture/app"
import { copyPlugin } from "./fixture/fixture"

beforeEach(() => {
  takeDraft(undefined)
})

test("plugins insert into the prompt at the cursor and rewrite only their own span", async () => {
  await using plugin = await copyPlugin("prompt-insert")
  await using setup = await createAppFixture({ config: { animations: false, plugins: [plugin.directory] } })
  await setup.ready
  await setup.waitForFrame((frame) => frame.includes("Prompt fixture ready"))

  setup.mockInput.pressKey("F11")
  await setup.waitForFrame((frame) => frame.includes("prompt available=true text=[]"))

  await setup.mockInput.typeText("say ")
  await setup.waitForFrame((frame) => frame.includes("say"))
  setup.mockInput.pressKey("F9")
  await setup.waitForFrame((frame) => frame.includes("say hello wo"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("say hello wo")

  // A refined transcript replaces the earlier partial instead of appending to it.
  setup.mockInput.pressKey("F10")
  await setup.waitForFrame((frame) => frame.includes("say hello world"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("say hello world")

  // The cursor ends after the insertion, so typing continues naturally and nothing was submitted.
  await setup.mockInput.typeText("!")
  await setup.waitForFrame((frame) => frame.includes("say hello world!"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("say hello world!")
  setup.mockInput.pressKey("F11")
  await setup.waitForFrame((frame) => frame.includes("text=[say hello world!]"))
})

test("an insertion in the middle of the prompt leaves surrounding text intact on update", async () => {
  await using plugin = await copyPlugin("prompt-insert")
  await using setup = await createAppFixture({ config: { animations: false, plugins: [plugin.directory] } })
  await setup.ready
  await setup.waitForFrame((frame) => frame.includes("Prompt fixture ready"))

  await setup.mockInput.typeText("[] end")
  await setup.waitForFrame((frame) => frame.includes("[] end"))
  // Move the cursor between the brackets.
  for (let i = 0; i < 5; i++) setup.mockInput.pressArrow("left")
  setup.mockInput.pressKey("F9")
  await setup.waitForFrame((frame) => frame.includes("[hello wo] end"))
  setup.mockInput.pressKey("F10")
  await setup.waitForFrame((frame) => frame.includes("[hello world] end"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("[hello world] end")
})

test("wide characters in an insertion are replaced without eating neighbouring text", async () => {
  await using plugin = await copyPlugin("prompt-insert")
  await using setup = await createAppFixture({ config: { animations: false, plugins: [plugin.directory] } })
  await setup.ready
  await setup.waitForFrame((frame) => frame.includes("Prompt fixture ready"))

  await setup.mockInput.typeText("please ")
  await setup.waitForFrame((frame) => frame.includes("please"))
  setup.mockInput.pressKey("F7")
  await setup.waitForFrame((frame) => frame.includes("wide"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("please 🎤 wide")
  setup.mockInput.pressKey("F10")
  await setup.waitForFrame((frame) => frame.includes("please hello world"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("please hello world")
  setup.mockInput.pressKey("F7")
  await setup.waitForFrame((frame) => frame.includes("wide"))
  setup.mockInput.pressKey("F6")
  await setup.waitForFrame((frame) => !frame.includes("wide"))
  expect(setup.renderer.currentFocusedEditor?.plainText).toBe("please hello world")
})

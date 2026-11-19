import { Plugin } from "@opencode/plugin/tui"
import type { PromptInsertion } from "@opencode/plugin/tui/context"

export default Plugin.define({
  id: "fixture.prompt-insert",
  setup(context) {
    let insertion: PromptInsertion | undefined
    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          bind: "f9",
          run: () => {
            insertion = context.ui.prompt.insert("hello wo")
          },
        },
        { bind: "f10", run: () => void insertion?.update("hello world") },
        {
          bind: "f7",
          run: () => {
            insertion = context.ui.prompt.insert("🎤 wide")
          },
        },
        { bind: "f6", run: () => void insertion?.update("") },
        {
          bind: "f11",
          run: () => context.ui.toast.show({ message: `prompt available=${context.ui.prompt.available()} text=[${context.ui.prompt.text()}]` }),
        },
      ],
    }))
    context.ui.toast.show({ message: "Prompt fixture ready" })
  },
})

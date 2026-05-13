/**
 * Tiptap image extension wrapper.
 *
 * We use @tiptap/extension-image as-is for the node schema (inline + block image).
 * Paste / drop / slash-command behaviors live in DocumentEditor and SlashMenu —
 * they all funnel files through `uploadFile()` then call `editor.commands.setImage`.
 */
import Image from '@tiptap/extension-image'
export { Image }

/** Default config: allow base64? No — we always go through the upload pipeline. */
export const FlowMindImage = Image.configure({
  inline: false,
  allowBase64: false,
  HTMLAttributes: {
    class: 'fm-image',
  },
})

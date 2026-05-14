import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'

interface Props {
  value: string
  onChange: (v: string) => void
  /** Triggered when user presses ⌘K so we can open the command palette */
  onCommand?: () => void
  /** Triggered when user types `/` at line start — open slash menu */
  onSlash?: (pos: { from: number; to: number }) => void
  readOnly?: boolean
}

export default function MarkdownEditor({ value, onChange, onCommand, readOnly }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const onCommandRef = useRef(onCommand)
  onChangeRef.current = onChange
  onCommandRef.current = onCommand

  // Initial mount
  useEffect(() => {
    if (!hostRef.current) return
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        foldGutter(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        bracketMatching(),
        EditorView.lineWrapping,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        markdown({ base: markdownLanguage, codeLanguages: () => null }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
          {
            key: 'Mod-k',
            run: () => { onCommandRef.current?.(); return true },
          },
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString())
        }),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(!!readOnly),
        EditorView.theme({
          '&':           { height: '100%' },
          '.cm-scroller':{ overflow: 'auto', fontFamily: 'inherit' },
          '.cm-content': { padding: '20px 28px', caretColor: 'var(--accent)' },
          '.cm-line':    { padding: '0 4px' },
        }),
      ],
    })
    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view
    return () => view.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-sync when external value diverges (e.g. switched view in mind/flow then back)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  }, [value])

  return <div ref={hostRef} className="h-full overflow-hidden" />
}

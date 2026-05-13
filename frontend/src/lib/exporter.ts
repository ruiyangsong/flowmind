import type { Editor } from '@tiptap/react'

/**
 * Tiptap JSON → Markdown.
 * Handles starter-kit + task-list/task-item + our diagramBlock node.
 * Zero external deps.
 */
type Node = { type: string; attrs?: Record<string, any>; content?: Node[]; text?: string; marks?: { type: string }[] }

function renderInline(n: Node): string {
  if (n.type === 'text') {
    let t = n.text ?? ''
    const marks = n.marks?.map((m) => m.type) ?? []
    if (marks.includes('code'))   t = '`' + t + '`'
    if (marks.includes('bold'))   t = '**' + t + '**'
    if (marks.includes('italic')) t = '*'  + t + '*'
    if (marks.includes('strike')) t = '~~' + t + '~~'
    return t
  }
  if (n.type === 'hardBreak') return '  \n'
  return renderChildren(n)
}

function renderChildren(n: Node): string {
  return (n.content ?? []).map(renderInline).join('')
}

function renderBlock(n: Node, depth = 0): string {
  switch (n.type) {
    case 'heading': {
      const lvl = Math.max(1, Math.min(6, n.attrs?.level ?? 1))
      return '#'.repeat(lvl) + ' ' + renderChildren(n) + '\n\n'
    }
    case 'paragraph':       return renderChildren(n) + '\n\n'
    case 'horizontalRule':  return '---\n\n'
    case 'blockquote':
      return (n.content ?? []).map((c) => '> ' + renderBlock(c, depth).trimEnd()).join('\n') + '\n\n'
    case 'bulletList':
      return (n.content ?? []).map((li) => renderListItem(li, '- ', depth)).join('') + '\n'
    case 'orderedList':
      return (n.content ?? []).map((li, i) => renderListItem(li, `${i + 1}. `, depth)).join('') + '\n'
    case 'taskList':
      return (n.content ?? []).map((li) => {
        const mark = li.attrs?.checked ? '[x]' : '[ ]'
        return renderListItem(li, `- ${mark} `, depth)
      }).join('') + '\n'
    case 'codeBlock': {
      const lang = n.attrs?.language ?? ''
      return '```' + lang + '\n' + renderChildren(n) + '\n```\n\n'
    }
    case 'diagramBlock': {
      const d = n.attrs?.diagramData
      if (!d) return ''
      return '> _' + (d.type === 'mindmap' ? 'Mind map' : 'Flowchart') + '_ (' + (d.nodes?.length ?? 0) + ' nodes, '
        + (d.edges?.length ?? 0) + ' edges)\n\n'
    }
    default:
      return renderChildren(n) + '\n\n'
  }
}

function renderListItem(li: Node, bullet: string, depth: number): string {
  const indent = '  '.repeat(depth)
  const inner = (li.content ?? []).map((c, idx) => {
    if (c.type === 'paragraph') return (idx === 0 ? '' : indent + '  ') + renderChildren(c)
    return renderBlock(c, depth + 1)
  }).join('')
  return indent + bullet + inner.trimEnd() + '\n'
}

export function toMarkdown(editor: Editor, title: string): string {
  const json = editor.getJSON() as Node
  const body = (json.content ?? []).map((n) => renderBlock(n)).join('').trimEnd() + '\n'
  return `# ${title || 'Untitled'}\n\n${body}`
}

/**
 * Print-to-PDF: opens a hidden iframe with the editor's HTML + minimal print CSS
 * and triggers the browser's native print dialog. Zero extra bundle weight.
 */
export function printToPdf(editor: Editor, title: string) {
  const html = editor.getHTML()
  const safeTitle = (title || 'Untitled').replace(/[<>]/g, '')
  const doc = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
  body { font-family: 'Inter', -apple-system, system-ui, sans-serif; color:#222; max-width:720px; margin:40px auto; padding:0 24px; }
  h1 { font-size: 28px; margin: 0 0 24px; }
  h2 { font-size: 22px; margin-top: 24px; }
  h3 { font-size: 18px; }
  p, li { line-height: 1.55; }
  pre { background:#f3f4f6; padding:12px; border-radius:6px; overflow:auto; }
  code { font-family: 'JetBrains Mono', monospace; background:#f3f4f6; padding:1px 5px; border-radius:3px; }
  blockquote { border-left:3px solid #01696f; margin: 12px 0; padding-left:12px; color:#555; }
  ul[data-type="taskList"] { list-style: none; padding-left: 0; }
  ul[data-type="taskList"] li { display: flex; gap: 6px; }
  hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
  @media print { body { margin: 0; padding: 16mm 18mm; } }
</style></head>
<body><h1>${safeTitle}</h1>${html}
<script>window.onload=()=>{window.focus();window.print();}</script>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) { alert('Pop-up blocked. Please allow pop-ups to export PDF.'); return }
  w.document.open()
  w.document.write(doc)
  w.document.close()
}

export function downloadMarkdown(md: string, title: string) {
  const safe = (title || 'untitled').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `${safe || 'document'}.md`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

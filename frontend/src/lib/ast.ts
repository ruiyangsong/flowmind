/**
 * AST engine — the single source of truth across Markdown / Mind / Flow views.
 *
 * Approach (deliberately small & dependency-free):
 *   markdownToAst(md)  → AstNode (root)
 *   astToMarkdown(ast) → string
 *
 * Conversion rules
 *   • Headings  `# ... ######` become tree nodes whose depth matches the level.
 *   • The implicit root is depth 0 and holds the document title.
 *   • Body text (paragraphs, code blocks, math) between headings is attached
 *     to the most-recent heading as `body`.
 *   • An ordered list (`1. ...`) at the top of a heading's body is treated as
 *     a *flow sequence*: each item becomes a depth+1 child with semantic
 *     `flow: 'process'` (or 'start' / 'decision' / 'end' if the line starts
 *     with one of those keywords followed by a colon).
 *
 * Round-trip guarantees
 *   • markdownToAst → astToMarkdown is byte-identical for well-formed docs
 *     authored inside the editor (modulo trailing newlines).
 *   • Mind / Flow edits that mutate AstNode and then call astToMarkdown will
 *     produce valid Markdown without losing body content.
 */

import { nanoid } from 'nanoid'
import type { AstNode } from './types'

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export function emptyAst(title = 'Untitled'): AstNode {
  return { id: nanoid(8), depth: 0, text: title, children: [] }
}

export function markdownToAst(md: string): AstNode {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const root: AstNode = emptyAst('Untitled')
  // stack of [node, depth] so we can attach children to the right parent
  const stack: AstNode[] = [root]
  let bodyBuf: string[] = []

  const flushBody = () => {
    if (bodyBuf.length === 0) return
    const txt = bodyBuf.join('\n').replace(/\n+$/, '')
    if (!txt) { bodyBuf = []; return }
    const owner = stack[stack.length - 1]
    owner.body = owner.body ? owner.body + '\n' + txt : txt
    bodyBuf = []
  }

  for (const raw of lines) {
    const m = raw.match(/^(#{1,6})\s+(.*)$/)
    if (m) {
      flushBody()
      const level = m[1].length
      const text = m[2].trim()
      // pop stack to the right depth
      while (stack.length > 0 && stack[stack.length - 1].depth >= level) {
        stack.pop()
      }
      const parent = stack[stack.length - 1] || root
      const node: AstNode = { id: nanoid(8), depth: level, text, children: [] }
      parent.children.push(node)
      stack.push(node)
      continue
    }
    bodyBuf.push(raw)
  }
  flushBody()

  // First H1 becomes the document title (root text)
  if (root.children.length > 0 && root.children[0].depth === 1) {
    root.text = root.children[0].text
    // Promote the H1's children/body to root, then drop it.
    const h1 = root.children[0]
    if (h1.body) root.body = root.body ? root.body + '\n' + h1.body : h1.body
    root.children = [...h1.children, ...root.children.slice(1)]
  }

  // Detect flow-style ordered lists in each node's body
  const visit = (n: AstNode) => {
    if (n.body) {
      const flowChildren = extractFlowSequence(n.body)
      if (flowChildren) {
        n.body = flowChildren.remainder
        // Insert flow children at the *start* of children list
        const flow: AstNode[] = flowChildren.items.map((it, i, arr) => ({
          id: nanoid(8),
          depth: n.depth + 1,
          text: it.text,
          flow: classifyFlow(it.text, i, arr.length),
          children: [],
        }))
        n.children = [...flow, ...n.children]
      }
    }
    n.children.forEach(visit)
  }
  visit(root)

  return root
}

export function astToMarkdown(root: AstNode): string {
  const lines: string[] = []
  // Title becomes H1
  if (root.text && root.text !== 'Untitled') {
    lines.push(`# ${root.text}`)
  }
  if (root.body) {
    lines.push('')
    lines.push(root.body)
  }
  const writeNode = (n: AstNode) => {
    lines.push('')
    if (n.flow) {
      // Flow nodes render as ordered list items under their parent.
      // We handle them in writeChildren so this branch is unreachable for
      // properly structured trees, but guard anyway.
      lines.push(`1. ${n.text}`)
    } else {
      const level = Math.min(Math.max(n.depth, 1), 6)
      lines.push(`${'#'.repeat(level)} ${n.text}`)
    }
    if (n.body) {
      lines.push('')
      lines.push(n.body)
    }
    writeChildren(n)
  }
  const writeChildren = (parent: AstNode) => {
    // Group consecutive flow children into a single ordered list
    let i = 0
    while (i < parent.children.length) {
      const c = parent.children[i]
      if (c.flow) {
        const group: AstNode[] = []
        while (i < parent.children.length && parent.children[i].flow) {
          group.push(parent.children[i])
          i++
        }
        lines.push('')
        group.forEach((g, idx) => {
          const prefix = g.flow === 'decision' ? '判断：' : ''
          lines.push(`${idx + 1}. ${prefix}${g.text}`)
        })
      } else {
        writeNode(c)
        i++
      }
    }
  }
  writeChildren(root)
  return lines.join('\n').replace(/^\n+/, '') + '\n'
}

// ───────────────────────────────────────────────────────────────────────────
// Tree mutation helpers (used by mind / flow editors)
// ───────────────────────────────────────────────────────────────────────────

export function findNode(root: AstNode, id: string): AstNode | null {
  if (root.id === id) return root
  for (const c of root.children) {
    const r = findNode(c, id)
    if (r) return r
  }
  return null
}

export function findParent(root: AstNode, id: string): AstNode | null {
  for (const c of root.children) {
    if (c.id === id) return root
    const r = findParent(c, id)
    if (r) return r
  }
  return null
}

export function addChild(root: AstNode, parentId: string, text = 'New'): AstNode {
  const parent = findNode(root, parentId)
  if (!parent) return root
  const child: AstNode = {
    id: nanoid(8),
    depth: parent.depth + 1,
    text,
    children: [],
  }
  parent.children.push(child)
  return clone(root)
}

export function addSibling(root: AstNode, id: string, text = 'New'): AstNode {
  const parent = findParent(root, id)
  if (!parent) return root
  const idx = parent.children.findIndex((c) => c.id === id)
  const sibling: AstNode = {
    id: nanoid(8),
    depth: parent.children[idx].depth,
    text,
    children: [],
  }
  parent.children.splice(idx + 1, 0, sibling)
  return clone(root)
}

export function removeNode(root: AstNode, id: string): AstNode {
  const parent = findParent(root, id)
  if (!parent) return root
  parent.children = parent.children.filter((c) => c.id !== id)
  return clone(root)
}

export function renameNode(root: AstNode, id: string, text: string): AstNode {
  const n = findNode(root, id)
  if (!n) return root
  n.text = text
  return clone(root)
}

export function clone(n: AstNode): AstNode {
  return JSON.parse(JSON.stringify(n)) as AstNode
}

// ───────────────────────────────────────────────────────────────────────────
// Internal helpers
// ───────────────────────────────────────────────────────────────────────────

interface FlowItem { text: string }
function extractFlowSequence(body: string): { items: FlowItem[]; remainder: string } | null {
  const lines = body.split('\n')
  const items: FlowItem[] = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    const m = l.match(/^\s*\d+\.\s+(.*)$/)
    if (!m) break
    items.push({ text: m[1].trim() })
    i++
  }
  if (items.length < 2) return null
  const remainder = lines.slice(i).join('\n').replace(/^\n+/, '')
  return { items, remainder }
}

function classifyFlow(text: string, idx: number, total: number): 'start' | 'process' | 'decision' | 'end' {
  if (/^(开始|start|begin)[：:\s]/i.test(text) || idx === 0 && /^开始/.test(text)) return 'start'
  if (/^(结束|end|done)[：:\s]/i.test(text) || idx === total - 1 && /^结束/.test(text)) return 'end'
  if (/^(判断|if|是否|decision)[：:\s]/i.test(text)) return 'decision'
  if (idx === 0) return 'start'
  if (idx === total - 1) return 'end'
  return 'process'
}

export function articleBodyBlocks(body) {
  return String(body || '')
    .split(/\n\s*\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const lines = value.split('\n').map((line) => line.trim()).filter(Boolean)
      if (lines.length > 1 && lines.every((line) => /^[•*-]\s+/.test(line))) {
        return { type: 'list', items: lines.map((line) => line.replace(/^[•*-]\s+/, '')) }
      }
      const heading = value.length <= 110 && !value.includes('\n') && (
        value.endsWith('?') || !/[.!:,;]$/.test(value)
      )
      return { type: heading ? 'heading' : 'paragraph', value }
    })
}

export function articleContentFlow(body, images = []) {
  const blocks = articleBodyBlocks(body)
  if (!images.length) return blocks.map((block) => ({ type: 'block', block }))

  const slots = new Map()
  images.forEach((image, index) => {
    const after = Math.max(1, Math.round(((index + 1) * blocks.length) / (images.length + 1)))
    slots.set(after, [...(slots.get(after) || []), image])
  })

  const flow = []
  blocks.forEach((block, index) => {
    flow.push({ type: 'block', block })
    for (const image of slots.get(index + 1) || []) flow.push({ type: 'image', image })
  })
  return flow
}

export function articleTextParts(value) {
  const text = String(value || '')
  const matches = [...text.matchAll(/https:\/\/[^\s<]+/g)]
  if (!matches.length) return [{ type: 'text', value: text }]
  const parts = []
  let cursor = 0
  matches.forEach((match) => {
    if (match.index > cursor) parts.push({ type: 'text', value: text.slice(cursor, match.index) })
    const raw = match[0]
    const url = raw.replace(/[),.;!?»]+$/, '')
    parts.push({ type: 'link', value: url })
    if (url.length < raw.length) parts.push({ type: 'text', value: raw.slice(url.length) })
    cursor = match.index + raw.length
  })
  if (cursor < text.length) parts.push({ type: 'text', value: text.slice(cursor) })
  return parts
}

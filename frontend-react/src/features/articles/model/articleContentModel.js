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

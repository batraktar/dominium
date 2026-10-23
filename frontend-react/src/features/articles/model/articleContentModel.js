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

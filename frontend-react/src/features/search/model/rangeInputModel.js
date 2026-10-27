import { clamp } from '../utils/searchPageUtils.js'

export function parseRangeInputDraft(value) {
  const draft = String(value ?? '').trim()
  if (draft === '') return null

  const numeric = Number.parseInt(draft, 10)
  return Number.isFinite(numeric) ? numeric : null
}

export function commitRangeInput(value, { fallback, min, max }) {
  const numeric = parseRangeInputDraft(value)
  return clamp(numeric ?? fallback, min, max)
}

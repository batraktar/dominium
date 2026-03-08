export function readBodyBoolDataset(key, fallback = false) {
  const rawValue = document.body?.dataset?.[key]
  if (rawValue === '1' || rawValue === 'true') return true
  if (rawValue === '0' || rawValue === 'false') return false
  return fallback
}

export function readBodyStringDataset(key, fallback = '') {
  const rawValue = document.body?.dataset?.[key]
  if (typeof rawValue === 'string') return rawValue
  return fallback
}

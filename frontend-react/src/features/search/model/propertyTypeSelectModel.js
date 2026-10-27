export function findChangedPropertyTypes(previousValues = [], nextValues = []) {
  const previous = new Set(previousValues)
  const next = new Set(nextValues)
  return [...new Set([...previousValues, ...nextValues])]
    .filter((value) => previous.has(value) !== next.has(value))
}

export function normalizeSelectedPropertyTypes(selectedValues = [], propertyTypes = []) {
  const valueMap = new Map()

  propertyTypes.forEach((propertyType) => {
    const id = String(propertyType.id)
    valueMap.set(id, id)
    if (propertyType.slug) valueMap.set(propertyType.slug, id)
  })

  return [...new Set(selectedValues.map((value) => valueMap.get(String(value))).filter(Boolean))]
}

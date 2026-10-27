export function findChangedPropertyTypes(previousValues = [], nextValues = []) {
  const previous = new Set(previousValues)
  const next = new Set(nextValues)
  return [...new Set([...previousValues, ...nextValues])]
    .filter((value) => previous.has(value) !== next.has(value))
}

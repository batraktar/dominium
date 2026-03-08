export default function useSearchPropertyTypeActions({
  setSelectedPropertyTypes,
  setPage,
}) {
  const togglePropertyType = (slug) => {
    setSelectedPropertyTypes((previous) => {
      if (previous.includes(slug)) {
        return previous.filter((item) => item !== slug)
      }
      return [...previous, slug]
    })
    setPage(1)
  }

  const resetPropertyTypes = () => {
    setSelectedPropertyTypes([])
    setPage(1)
  }

  return {
    togglePropertyType,
    resetPropertyTypes,
  }
}

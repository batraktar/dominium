function SearchErrorState({
  searchError = '',
}) {
  if (!searchError) return null

  return <div className="text-center text-sm text-red-200 py-2">{searchError}</div>
}

export default SearchErrorState

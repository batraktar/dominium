function SearchLoadingIndicator({
  isLoading = false,
}) {
  return (
    <div
      id="search-loading-indicator"
      className={`${isLoading ? '' : 'hidden'} text-center text-sm text-creamBeige py-2`}
    >
      Оновлюємо результати…
    </div>
  )
}

export default SearchLoadingIndicator

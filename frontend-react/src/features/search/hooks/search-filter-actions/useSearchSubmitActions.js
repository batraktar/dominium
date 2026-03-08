export default function useSearchSubmitActions({
  queryInput = '',
  setQuery,
  setPage,
}) {
  const submitSearch = () => {
    setPage(1)
    setQuery(queryInput.trim())
  }

  const handleHeaderSubmit = (event) => {
    event.preventDefault()
    submitSearch()
  }

  const handleMainSubmit = (event) => {
    event.preventDefault()
    submitSearch()
  }

  return {
    handleHeaderSubmit,
    handleMainSubmit,
  }
}

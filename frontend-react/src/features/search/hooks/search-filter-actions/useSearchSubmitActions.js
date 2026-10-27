import { trackJourneyEvent } from '../../../../shared/analytics/journey.js'

export default function useSearchSubmitActions({
  queryInput = '',
  setQuery,
  setPage,
}) {
  const submitSearch = () => {
    trackJourneyEvent('search', { metadata: { query: queryInput.trim() } })
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

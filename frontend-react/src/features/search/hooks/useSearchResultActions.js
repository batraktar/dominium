import useSearchFeaturedActions from './search-result-actions/useSearchFeaturedActions.js'
import useSearchLikeActions from './search-result-actions/useSearchLikeActions.js'
import useSearchShareActions from './search-result-actions/useSearchShareActions.js'
import useSearchResultToast from './search-result-actions/useSearchResultToast.js'

function requestAuth(next = `${window.location.pathname}${window.location.search}`) {
  window.dispatchEvent(
    new CustomEvent('dominium:auth-required', {
      detail: { next },
    }),
  )
}

export default function useSearchResultActions({
  userIsAuthenticated = false,
  setLikedIds,
  setResults,
  setOpenShareMenuId,
  toastTimerRef,
}) {
  const { showToast } = useSearchResultToast({ toastTimerRef })

  const likeActions = useSearchLikeActions({
    userIsAuthenticated,
    setLikedIds,
    showToast,
    requestAuth,
  })

  const featuredActions = useSearchFeaturedActions({
    setResults,
    showToast,
  })

  const shareActions = useSearchShareActions({
    setOpenShareMenuId,
    showToast,
  })

  return {
    ...likeActions,
    ...featuredActions,
    ...shareActions,
  }
}

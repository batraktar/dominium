import { getCsrfTokenFromDom } from '../../../shared/utils/csrf.js'
import useLikesFeaturedActions from './likes-page/useLikesFeaturedActions.js'
import useLikesLikeActions from './likes-page/useLikesLikeActions.js'
import useLikesPageLoadEffect from './likes-page/useLikesPageLoadEffect.js'
import useLikesPageRuntimeRefs from './likes-page/useLikesPageRuntimeRefs.js'
import useLikesPageState from './likes-page/useLikesPageState.js'
import useLikesPageToast from './likes-page/useLikesPageToast.js'
import useLikesShareActions from './likes-page/useLikesShareActions.js'
import useLikesShareMenuEffect from './likes-page/useLikesShareMenuEffect.js'

function requestAuth(next = `${window.location.pathname}${window.location.search}`) {
  window.dispatchEvent(
    new CustomEvent('dominium:auth-required', {
      detail: { next },
    }),
  )
}

export default function useLikesPageController({ userIsAuthenticated = false }) {
  const {
    properties,
    setProperties,
    likedIds,
    setLikedIds,
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,
    openShareMenuId,
    setOpenShareMenuId,
  } = useLikesPageState()

  const { toastTimerRef } = useLikesPageRuntimeRefs()
  const { showToast } = useLikesPageToast({ toastTimerRef })

  useLikesPageLoadEffect({
    userIsAuthenticated,
    requestAuth,
    setIsLoading,
    setLoadError,
    setProperties,
    setLikedIds,
  })

  useLikesShareMenuEffect({
    setOpenShareMenuId,
  })

  const { toggleLike } = useLikesLikeActions({
    userIsAuthenticated,
    requestAuth,
    setLikedIds,
    showToast,
  })

  const { toggleFeatured } = useLikesFeaturedActions({
    setProperties,
    showToast,
  })

  const { handleToggleShareMenu, handleShare } = useLikesShareActions({
    setOpenShareMenuId,
    showToast,
  })

  return {
    properties,
    likedIds,
    isLoading,
    loadError,
    openShareMenuId,
    handleToggleShareMenu,
    toggleLike,
    toggleFeatured,
    handleShare,
    csrfToken: getCsrfTokenFromDom(),
  }
}

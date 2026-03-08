import LikesPageHeader from '../components/LikesPageHeader.jsx'
import LikesResultsSection from '../components/LikesResultsSection.jsx'
import useLikesPageController from '../hooks/useLikesPageController.js'

function LikesPage({ userIsStaff = false, userIsAuthenticated = false }) {
  const {
    properties,
    likedIds,
    isLoading,
    loadError,
    openShareMenuId,
    handleToggleShareMenu,
    toggleLike,
    toggleFeatured,
    handleShare,
    csrfToken,
  } = useLikesPageController({ userIsAuthenticated })

  return (
    <>
      <input type="hidden" id="form-csrf-token" value={csrfToken} />
      <LikesPageHeader />
      <LikesResultsSection
        properties={properties}
        likedIds={likedIds}
        isLoading={isLoading}
        loadError={loadError}
        userIsStaff={userIsStaff}
        openShareMenuId={openShareMenuId}
        onToggleLike={toggleLike}
        onToggleFeatured={toggleFeatured}
        onToggleShareMenu={handleToggleShareMenu}
        onShare={handleShare}
      />
    </>
  )
}

export default LikesPage

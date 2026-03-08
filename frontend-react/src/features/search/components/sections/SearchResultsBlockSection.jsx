import SearchAdvancedFiltersModal from '../SearchAdvancedFiltersModal.jsx'
import SearchErrorState from '../SearchErrorState.jsx'
import SearchLoadingIndicator from '../SearchLoadingIndicator.jsx'
import SearchResultsSection from '../SearchResultsSection.jsx'

function SearchResultsBlockSection({
  results,
  isLoading,
  likedIds,
  userIsStaff = false,
  openShareMenuId,
  handleToggleShareMenu,
  selectedCurrencyMeta,
  toggleLike,
  toggleFeatured,
  handleResultShare,
  page,
  totalPages,
  visiblePages,
  setPage,
  searchError,
}) {
  return (
    <>
      <SearchResultsSection
        results={results}
        isLoading={isLoading}
        likedIds={likedIds}
        userIsStaff={userIsStaff}
        openShareMenuId={openShareMenuId}
        onToggleShareMenu={handleToggleShareMenu}
        selectedCurrencyMeta={selectedCurrencyMeta}
        onToggleLike={toggleLike}
        onToggleFeatured={toggleFeatured}
        onShare={handleResultShare}
        page={page}
        totalPages={totalPages}
        visiblePages={visiblePages}
        onPageChange={setPage}
      />

      <SearchLoadingIndicator isLoading={isLoading} />
      <SearchErrorState searchError={searchError} />
      <SearchAdvancedFiltersModal />
    </>
  )
}

export default SearchResultsBlockSection

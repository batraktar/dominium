import '../../../../../static/base/assets/css/search-filters.css'
import '../../../search-page.css'
import SearchResultsBlockSection from '../components/sections/SearchResultsBlockSection.jsx'
import SearchTopControlsSection from '../components/sections/SearchTopControlsSection.jsx'
import useSearchPageController from '../hooks/useSearchPageController.js'

function SearchPage({ userIsStaff = false, userIsAuthenticated = false }) {
  const {
    queryInput,
    setQueryInput,
    query,
    openDropdown,
    toggleDropdown,
    propertyTypeSummary,
    propertyTypes,
    selectedPropertyTypes,
    togglePropertyType,
    resetPropertyTypes,
    priceRange,
    areaRange,
    roomsRange,
    resetPriceRange,
    resetAreaRange,
    resetRoomsRange,
    handlePriceMinInput,
    handlePriceMaxInput,
    handleAreaMinInput,
    handleAreaMaxInput,
    handleRoomsMinInput,
    handleRoomsMaxInput,
    activeChips,
    clearChip,
    handleHeaderSubmit,
    handleMainSubmit,
    csrfToken,
    totalCount,
    sortOption,
    selectedSortLabel,
    handleSortOptionChange,
    perPage,
    handlePerPageChange,
    currency,
    handleCurrencyChange,
    selectedCurrencyMeta,
    todayDate,
    results,
    isLoading,
    likedIds,
    openShareMenuId,
    handleToggleShareMenu,
    toggleLike,
    toggleFeatured,
    handleResultShare,
    page,
    totalPages,
    visiblePages,
    setPage,
    searchError,
  } = useSearchPageController({ userIsAuthenticated })

  return (
    <>
      <SearchTopControlsSection
        queryInput={queryInput}
        setQueryInput={setQueryInput}
        handleHeaderSubmit={handleHeaderSubmit}
        query={query}
        csrfToken={csrfToken}
        handleMainSubmit={handleMainSubmit}
        openDropdown={openDropdown}
        toggleDropdown={toggleDropdown}
        propertyTypeSummary={propertyTypeSummary}
        propertyTypes={propertyTypes}
        selectedPropertyTypes={selectedPropertyTypes}
        togglePropertyType={togglePropertyType}
        resetPropertyTypes={resetPropertyTypes}
        priceRange={priceRange}
        areaRange={areaRange}
        roomsRange={roomsRange}
        resetPriceRange={resetPriceRange}
        resetAreaRange={resetAreaRange}
        resetRoomsRange={resetRoomsRange}
        handlePriceMinInput={handlePriceMinInput}
        handlePriceMaxInput={handlePriceMaxInput}
        handleAreaMinInput={handleAreaMinInput}
        handleAreaMaxInput={handleAreaMaxInput}
        handleRoomsMinInput={handleRoomsMinInput}
        handleRoomsMaxInput={handleRoomsMaxInput}
        activeChips={activeChips}
        clearChip={clearChip}
        totalCount={totalCount}
        sortOption={sortOption}
        selectedSortLabel={selectedSortLabel}
        handleSortOptionChange={handleSortOptionChange}
        perPage={perPage}
        handlePerPageChange={handlePerPageChange}
        currency={currency}
        handleCurrencyChange={handleCurrencyChange}
        selectedCurrencyMeta={selectedCurrencyMeta}
        todayDate={todayDate}
      />

      <SearchResultsBlockSection
        results={results}
        isLoading={isLoading}
        likedIds={likedIds}
        userIsStaff={userIsStaff}
        openShareMenuId={openShareMenuId}
        handleToggleShareMenu={handleToggleShareMenu}
        selectedCurrencyMeta={selectedCurrencyMeta}
        toggleLike={toggleLike}
        toggleFeatured={toggleFeatured}
        handleResultShare={handleResultShare}
        page={page}
        totalPages={totalPages}
        visiblePages={visiblePages}
        setPage={setPage}
        searchError={searchError}
      />
    </>
  )
}

export default SearchPage

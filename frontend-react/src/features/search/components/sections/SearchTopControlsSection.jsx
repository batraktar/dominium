import SearchCurrencyInfoCard from '../SearchCurrencyInfoCard.jsx'
import SearchFiltersForm from '../SearchFiltersForm.jsx'
import SearchHeaderBar from '../SearchHeaderBar.jsx'
import SearchSortBar from '../SearchSortBar.jsx'
import {
  AREA_RANGE_CONFIG,
  CURRENCY_OPTIONS,
  PER_PAGE_OPTIONS,
  PRICE_RANGE_CONFIG,
  ROOMS_RANGE_CONFIG,
  SORT_OPTIONS,
} from '../../constants/searchConfig.js'
import { buildRangeBackground, formatNumber } from '../../utils/searchPageUtils.js'

function SearchTopControlsSection({
  queryInput,
  setQueryInput,
  handleHeaderSubmit,
  query,
  csrfToken,
  handleMainSubmit,
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
}) {
  return (
    <>
      <SearchHeaderBar
        queryInput={queryInput}
        onQueryInputChange={(event) => setQueryInput(event.target.value)}
        onSubmit={handleHeaderSubmit}
      />

      <SearchFiltersForm
        query={query}
        csrfToken={csrfToken}
        onSubmit={handleMainSubmit}
        openDropdown={openDropdown}
        onToggleDropdown={toggleDropdown}
        propertyTypeSummary={propertyTypeSummary}
        propertyTypes={propertyTypes}
        selectedPropertyTypes={selectedPropertyTypes}
        onTogglePropertyType={togglePropertyType}
        onResetPropertyTypes={resetPropertyTypes}
        priceRange={priceRange}
        areaRange={areaRange}
        roomsRange={roomsRange}
        onResetPriceRange={resetPriceRange}
        onResetAreaRange={resetAreaRange}
        onResetRoomsRange={resetRoomsRange}
        onPriceMinInput={handlePriceMinInput}
        onPriceMaxInput={handlePriceMaxInput}
        onAreaMinInput={handleAreaMinInput}
        onAreaMaxInput={handleAreaMaxInput}
        onRoomsMinInput={handleRoomsMinInput}
        onRoomsMaxInput={handleRoomsMaxInput}
        formatNumber={formatNumber}
        buildRangeBackground={buildRangeBackground}
        priceRangeConfig={PRICE_RANGE_CONFIG}
        areaRangeConfig={AREA_RANGE_CONFIG}
        roomsRangeConfig={ROOMS_RANGE_CONFIG}
        activeChips={activeChips}
        onClearChip={clearChip}
      />

      <SearchSortBar
        totalCount={totalCount}
        openDropdown={openDropdown}
        onToggleDropdown={toggleDropdown}
        sortOption={sortOption}
        selectedSortLabel={selectedSortLabel}
        onSortOptionChange={handleSortOptionChange}
        sortOptions={SORT_OPTIONS}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        perPageOptions={PER_PAGE_OPTIONS}
        currency={currency}
        onCurrencyChange={handleCurrencyChange}
        currencyOptions={CURRENCY_OPTIONS}
      />

      <SearchCurrencyInfoCard selectedCurrencyMeta={selectedCurrencyMeta} todayDate={todayDate} />
    </>
  )
}

export default SearchTopControlsSection

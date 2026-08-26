import SearchActiveFilterChips from './filters/SearchActiveFilterChips.jsx'
import SearchFiltersSubmitRow from './filters/SearchFiltersSubmitRow.jsx'
import SearchPropertyTypeFilterCard from './filters/SearchPropertyTypeFilterCard.jsx'
import SearchRangeFilterCard from './filters/SearchRangeFilterCard.jsx'

function SearchFiltersForm({
  query = '',
  csrfToken = '',
  onSubmit,
  openDropdown,
  onToggleDropdown,
  propertyTypeSummary,
  propertyTypes = [],
  selectedPropertyTypes = [],
  onTogglePropertyType,
  onResetPropertyTypes,
  priceRange,
  areaRange,
  roomsRange,
  onResetPriceRange,
  onResetAreaRange,
  onResetRoomsRange,
  onPriceMinInput,
  onPriceMaxInput,
  onAreaMinInput,
  onAreaMaxInput,
  onRoomsMinInput,
  onRoomsMaxInput,
  formatNumber,
  buildRangeBackground,
  priceRangeConfig,
  areaRangeConfig,
  roomsRangeConfig,
  activeChips = [],
  onClearChip,
}) {
  const priceMinLabel = `Від ${formatNumber(priceRange.min)} $`
  const priceMaxLabel = `До ${formatNumber(priceRange.max)} $`

  const areaMinLabel = `Від ${formatNumber(areaRange.min)} м²`
  const areaMaxLabel = `До ${formatNumber(areaRange.max)} м²`

  const roomsMinLabel = roomsRange.min <= 0 ? 'Від будь-якої' : `Від ${roomsRange.min}`
  const roomsMaxLabel =
    roomsRange.max >= roomsRangeConfig.max ? 'До 6+' : `До ${roomsRange.max}`

  return (
    <form method="get" action="/search/" id="main-search-form" onSubmit={onSubmit}>
      <input type="hidden" id="form-csrf-token" value={csrfToken} />
      <input type="hidden" name="q" id="q-hidden" value={query} readOnly />

      <div className="container mx-auto px-4 py-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <SearchPropertyTypeFilterCard
            openDropdown={openDropdown}
            onToggleDropdown={onToggleDropdown}
            propertyTypeSummary={propertyTypeSummary}
            propertyTypes={propertyTypes}
            selectedPropertyTypes={selectedPropertyTypes}
            onTogglePropertyType={onTogglePropertyType}
            onResetPropertyTypes={onResetPropertyTypes}
          />

          <SearchRangeFilterCard
            filterKey="price"
            label="Ціна, $"
            onReset={onResetPriceRange}
            minLabel={priceMinLabel}
            maxLabel={priceMaxLabel}
            range={priceRange}
            rangeConfig={priceRangeConfig}
            buildRangeBackground={buildRangeBackground}
            onMinInput={onPriceMinInput}
            onMaxInput={onPriceMaxInput}
          />

          <SearchRangeFilterCard
            filterKey="area"
            label="Площа, м²"
            onReset={onResetAreaRange}
            minLabel={areaMinLabel}
            maxLabel={areaMaxLabel}
            range={areaRange}
            rangeConfig={areaRangeConfig}
            buildRangeBackground={buildRangeBackground}
            onMinInput={onAreaMinInput}
            onMaxInput={onAreaMaxInput}
          />

          <SearchRangeFilterCard
            filterKey="rooms"
            label="Кількість кімнат"
            onReset={onResetRoomsRange}
            minLabel={roomsMinLabel}
            maxLabel={roomsMaxLabel}
            range={roomsRange}
            rangeConfig={roomsRangeConfig}
            buildRangeBackground={buildRangeBackground}
            onMinInput={onRoomsMinInput}
            onMaxInput={onRoomsMaxInput}
          />
        </div>

        <SearchActiveFilterChips activeChips={activeChips} onClearChip={onClearChip} />
        <SearchFiltersSubmitRow />
      </div>
    </form>
  )
}

export default SearchFiltersForm

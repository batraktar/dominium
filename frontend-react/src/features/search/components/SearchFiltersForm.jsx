import SearchActiveFilterChips from './filters/SearchActiveFilterChips.jsx'
import SearchFiltersSubmitRow from './filters/SearchFiltersSubmitRow.jsx'
import SearchPropertyTypeFilterCard from './filters/SearchPropertyTypeFilterCard.jsx'
import SearchRangeFilterCard from './filters/SearchRangeFilterCard.jsx'
import SearchLocationSelect from './filters/SearchLocationSelect.jsx'

function SearchFiltersForm({
  query = '',
  location = '',
  onLocationChange,
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

      <div className="search-filters-panel container mx-auto px-4 py-5 space-y-5">
        <div className="search-filters-heading">
          <div>
            <p className="search-filters-eyebrow">Підберемо нерухомість</p>
            <h2>Що саме ви шукаєте?</h2>
          </div>
          <p>Оберіть основні параметри — решту можна уточнити після пошуку.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="search-filter-card min-h-[118px] flex flex-col justify-between">
            <label htmlFor="location-filter" className="search-filter-label"><i className="ri-map-pin-2-line"></i><span>Де шукаємо?</span></label>
            <SearchLocationSelect value={location} onChange={onLocationChange} />
          </div>
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

        <div className="search-filter-footer">
          <SearchActiveFilterChips activeChips={activeChips} onClearChip={onClearChip} />
          <SearchFiltersSubmitRow />
        </div>
      </div>
    </form>
  )
}

export default SearchFiltersForm

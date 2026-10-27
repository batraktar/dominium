import SearchActiveFilterChips from './filters/SearchActiveFilterChips.jsx'
import SearchFiltersSubmitRow from './filters/SearchFiltersSubmitRow.jsx'
import SearchPropertyTypeFilterCard from './filters/SearchPropertyTypeFilterCard.jsx'
import SearchRangeFilterCard from './filters/SearchRangeFilterCard.jsx'
import { LOCATION_OPTIONS } from '../constants/searchConfig.js'

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

      <div className="container mx-auto px-4 py-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="bg-coolSage/90 rounded-[12px] px-5 py-4 text-white shadow-sm min-h-[118px] flex flex-col justify-between">
            <label htmlFor="location-filter" className="text-xs uppercase tracking-wide text-creamBeige/80 font-semibold mb-3">Населений пункт</label>
            <select id="location-filter" value={location} onChange={(event) => onLocationChange?.(event.target.value)} className="dropdown-trigger w-full text-deepOcean bg-white">
              <option value="">Усі населені пункти</option>
              {LOCATION_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
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

        <SearchActiveFilterChips activeChips={activeChips} onClearChip={onClearChip} />
        <SearchFiltersSubmitRow />
      </div>
    </form>
  )
}

export default SearchFiltersForm

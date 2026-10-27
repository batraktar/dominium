function SearchRangeFilterCard({
  filterKey,
  label,
  onReset,
  minLabel,
  maxLabel,
  range,
  rangeConfig,
  buildRangeBackground,
  onMinInput,
  onMaxInput,
}) {
  return (
    <div
      className="filter-range search-filter-card min-h-[118px]"
      data-filter-key={filterKey}
    >
      <div className="search-filter-label flex items-center justify-between mb-3">
        <span><i className={filterKey === 'price' ? 'ri-money-dollar-circle-line' : filterKey === 'area' ? 'ri-ruler-2-line' : 'ri-door-open-line'}></i>{label}</span>
        <button
          type="button"
          className="filter-reset"
          onClick={onReset}
        >
          Очистити
        </button>
      </div>

      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="grid grid-cols-2 gap-2 text-sm font-fixel">
          <label className="search-filter-number">
            <span>Від</span>
            <input aria-label={`${label}: від`} type="number" min={rangeConfig.min} max={range.max - rangeConfig.step} step={rangeConfig.step} value={range.min} onChange={onMinInput} className="w-full bg-transparent font-semibold outline-none" />
          </label>
          <label className="search-filter-number">
            <span>До</span>
            <input aria-label={`${label}: до`} type="number" min={range.min + rangeConfig.step} max={rangeConfig.max} step={rangeConfig.step} value={range.max} onChange={onMaxInput} className="w-full bg-transparent font-semibold outline-none" />
          </label>
        </div>
        <div className="search-filter-summary"><span>{minLabel}</span><span>{maxLabel}</span></div>
        <div className="relative h-10">
          <input
            type="range"
            className="range-slider range-min"
            min={rangeConfig.min}
            max={rangeConfig.max}
            step={rangeConfig.step}
            value={range.min}
            style={{
              background: buildRangeBackground(
                rangeConfig.min,
                rangeConfig.max,
                range.min,
                range.max,
              ),
            }}
            onInput={onMinInput}
          />
          <input
            type="range"
            className="range-slider range-max"
            min={rangeConfig.min}
            max={rangeConfig.max}
            step={rangeConfig.step}
            value={range.max}
            style={{
              background: buildRangeBackground(
                rangeConfig.min,
                rangeConfig.max,
                range.min,
                range.max,
              ),
            }}
            onInput={onMaxInput}
          />
        </div>
      </div>
    </div>
  )
}

export default SearchRangeFilterCard

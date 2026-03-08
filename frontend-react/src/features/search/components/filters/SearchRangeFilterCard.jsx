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
      className="filter-range bg-coolSage/90 rounded-[12px] px-5 py-4 text-white shadow-sm min-h-[118px]"
      data-filter-key={filterKey}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-creamBeige/80 font-semibold mb-3">
        <span>{label}</span>
        <button
          type="button"
          className="filter-reset text-creamBeige/70 hover:text-white transition"
          onClick={onReset}
        >
          Очистити
        </button>
      </div>

      <div className="flex flex-col gap-3 h-full justify-between">
        <div className="flex items-center justify-between text-sm font-fixel">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
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

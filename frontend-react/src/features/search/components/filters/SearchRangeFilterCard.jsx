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
        <div className="grid grid-cols-2 gap-2 text-sm font-fixel">
          <label className="rounded-md bg-white/95 px-2 py-1 text-deepOcean">
            <span className="block text-[10px] text-deepOcean/60">Від</span>
            <input aria-label={`${label}: від`} type="number" min={rangeConfig.min} max={range.max - rangeConfig.step} step={rangeConfig.step} value={range.min} onChange={onMinInput} className="w-full bg-transparent font-semibold outline-none" />
          </label>
          <label className="rounded-md bg-white/95 px-2 py-1 text-deepOcean">
            <span className="block text-[10px] text-deepOcean/60">До</span>
            <input aria-label={`${label}: до`} type="number" min={range.min + rangeConfig.step} max={rangeConfig.max} step={rangeConfig.step} value={range.max} onChange={onMaxInput} className="w-full bg-transparent font-semibold outline-none" />
          </label>
        </div>
        <div className="flex items-center justify-between text-[11px] font-fixel text-creamBeige/85"><span>{minLabel}</span><span>{maxLabel}</span></div>
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

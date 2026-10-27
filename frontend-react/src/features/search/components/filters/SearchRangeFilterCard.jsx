import { useState } from 'react'

import { commitRangeInput } from '../../model/rangeInputModel.js'

function RangeNumberInput({ ariaLabel, value, fallback, min, max, onCommit }) {
  const [draft, setDraft] = useState(String(value))

  const commit = () => {
    const nextValue = commitRangeInput(draft, { fallback, min, max })
    setDraft(String(nextValue))
    onCommit?.({ currentTarget: { value: String(nextValue) } })
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      event.currentTarget.blur()
    }
  }

  return (
    <input
      aria-label={ariaLabel}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step="any"
      value={draft}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="w-full bg-transparent font-semibold outline-none"
    />
  )
}

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
            <RangeNumberInput
              key={`min-${range.min}`}
              ariaLabel={`${label}: від`}
              value={range.min}
              fallback={rangeConfig.min}
              min={rangeConfig.min}
              max={range.max - rangeConfig.step}
              onCommit={onMinInput}
            />
          </label>
          <label className="search-filter-number">
            <span>До</span>
            <RangeNumberInput
              key={`max-${range.max}`}
              ariaLabel={`${label}: до`}
              value={range.max}
              fallback={rangeConfig.max}
              min={range.min + rangeConfig.step}
              max={rangeConfig.max}
              onCommit={onMaxInput}
            />
          </label>
        </div>
        <div className="search-filter-summary"><span>{minLabel}</span><span>{maxLabel}</span></div>
        <div className="relative h-10">
          <input
            type="range"
            className="range-slider range-min"
            min={rangeConfig.min}
            max={rangeConfig.max}
            step={1}
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
            step={1}
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

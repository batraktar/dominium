function SearchActiveFilterChips({
  activeChips = [],
  onClearChip,
}) {
  return (
    <div id="active-filter-chips" className="flex flex-wrap gap-2">
      {activeChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="bg-white text-deepOcean border border-coolSage px-3 py-1.5 rounded-full text-xs font-fixel flex items-center gap-2 shadow-sm hover:bg-creamBeige transition"
          onClick={() => onClearChip?.(chip.key)}
        >
          <span className="font-semibold">{chip.label}:</span>
          <span>{chip.value}</span>
          <i className="ri-close-line text-base"></i>
        </button>
      ))}
    </div>
  )
}

export default SearchActiveFilterChips

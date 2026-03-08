function SearchFiltersSubmitRow() {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center">
      <button
        type="submit"
        className="w-full md:w-auto bg-deepOcean hover:bg-deepOcean/90 text-white font-fixel pr-8 py-4 px-6 rounded-[9px] whitespace-nowrap border border-creamBeige/70 shadow-lg shadow-deepOcean/20"
      >
        Пошук
      </button>
    </div>
  )
}

export default SearchFiltersSubmitRow

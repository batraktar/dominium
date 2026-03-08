function SearchAdvancedFiltersModal() {
  return (
    <div
      id="advanced-filters-modal"
      className="modal hidden fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
    >
      <div className="modal-content bg-white w-full sm:w-[80%] md:max-w-4xl sm:rounded-2xl p-4 sm:p-6 shadow-xl ring-1 ring-black/10 relative max-h-[90vh] overflow-y-auto sm:animate-fade-in animate-slide-up-mobile">
        <button
          id="close-filters-btn"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition"
          type="button"
        >
          <i className="ri-close-line text-gray-700 text-xl"></i>
        </button>
      </div>
    </div>
  )
}

export default SearchAdvancedFiltersModal

function SearchSortBar({
  totalCount = 0,
  openDropdown,
  onToggleDropdown,
  sortOption,
  selectedSortLabel,
  onSortOptionChange,
  sortOptions = [],
  perPage,
  onPerPageChange,
  perPageOptions = [],
  currency,
  onCurrencyChange,
  currencyOptions = [],
}) {
  return (
    <div id="property-sort-wrapper">
      <div className="bg-deepOcean py-3">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-3 md:mb-0">
              <span className="font-ermilov text-lg md:text-xl text-creamBeige">
                Знайдено {totalCount} об&apos;єктів
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5">
              <div className="flex items-center gap-3">
                <span className="text-sm text-creamBeige font-ermilov text-lg md:text-xl">Сортування</span>
                <div className="relative" data-react-dropdown>
                  <button
                    id="sort-btn"
                    type="button"
                    className="dropdown-trigger sort-trigger w-[200px]"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleDropdown?.('sort')
                    }}
                  >
                    <span className="font-fixel" id="sort-selected">
                      {selectedSortLabel}
                    </span>
                    <i className="ri-arrow-down-s-line"></i>
                  </button>

                  <div
                    id="sort-options"
                    className={`dropdown-menu ${openDropdown === 'sort' ? '' : 'hidden'}`}
                  >
                    <div className="py-1">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`sort-option block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                            sortOption === option.value ? 'font-semibold' : ''
                          }`}
                          onClick={() => onSortOptionChange?.(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-creamBeige font-ermilov">На сторінці:</span>
                <div className="relative" data-react-dropdown>
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleDropdown?.('per_page')
                    }}
                  >
                    <span data-per-page-display>{perPage}</span>
                    <i className="ri-arrow-down-s-line"></i>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'per_page' ? '' : 'hidden'}`}>
                    {perPageOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`dropdown-item w-full text-left ${perPage === option ? 'active' : ''}`}
                        onClick={() => onPerPageChange?.(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-sm text-creamBeige font-ermilov">Валюта:</span>
                <div className="relative" data-react-dropdown>
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleDropdown?.('currency')
                    }}
                  >
                    <span>{currencyOptions.find((option) => option.code === currency)?.label}</span>
                    <i className="ri-arrow-down-s-line"></i>
                  </button>
                  <div className={`dropdown-menu ${openDropdown === 'currency' ? '' : 'hidden'}`}>
                    {currencyOptions.map((option) => (
                      <button
                        key={option.code}
                        type="button"
                        className={`dropdown-item w-full text-left ${currency === option.code ? 'active' : ''}`}
                        onClick={() => onCurrencyChange?.(option.code)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchSortBar

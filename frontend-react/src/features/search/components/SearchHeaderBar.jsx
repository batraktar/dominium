function SearchHeaderBar({ queryInput = '', onQueryInputChange, onSubmit }) {
  return (
    <div className="sticky bg-deepOcean top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-4">
        <form method="get" action="/search/" id="header-search-form" onSubmit={onSubmit}>
          <div className="relative flex-grow">
            <input
              type="text"
              name="q"
              id="q-main"
              value={queryInput}
              onChange={onQueryInputChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 text-coolSage placeholder-coolSage rounded-[9px] focus:outline-none focus:ring-2 focus:ring-coolSage focus:border-transparent text-sm"
              placeholder="Введіть адресу, тип угоди або ключові слова"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <div className="w-5 h-5 flex items-center justify-center text-coolSage">
                <i className="ri-search-line text-coolSage"></i>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SearchHeaderBar

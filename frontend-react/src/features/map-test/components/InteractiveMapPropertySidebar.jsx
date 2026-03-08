import { formatMapPrice } from '../model/mapThemeModel.js'

function InteractiveMapPropertySidebar({
  query,
  onQueryChange,
  filteredProperties,
  activePropertyId,
  isLoading,
  onSelectProperty,
}) {
  return (
    <aside className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-5 flex flex-col min-h-[420px]">
      <label className="text-sm font-fixel text-deepOcean/80 mb-2" htmlFor="map-property-filter">
        Фільтр по назві або адресі
      </label>
      <div className="relative mb-3">
        <input
          id="map-property-filter"
          type="text"
          className="w-full rounded-[10px] border border-gray-300 px-10 py-2.5 text-sm font-fixel focus:outline-none focus:ring-2 focus:ring-coolSage focus:border-coolSage"
          placeholder="Напр. Ужгород, Львів, Київ..."
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-coolSage"></i>
      </div>

      <div
        id="map-empty-state"
        className={`${
          !isLoading && filteredProperties.length === 0 ? '' : 'hidden'
        } rounded-lg bg-gray-50 border border-gray-200 text-sm font-fixel text-deepOcean/70 px-4 py-3 mb-3`}
      >
        Нічого не знайдено за поточним фільтром.
      </div>

      <ul id="map-property-list" className="space-y-2 overflow-auto pr-1">
        {filteredProperties.map((item) => (
          <li key={item.id} className="map-list-item">
            <button
              type="button"
              data-property-id={item.id}
              className={`map-list-button ${activePropertyId === item.id ? 'is-active' : ''}`}
              onClick={() => onSelectProperty(item)}
            >
              <div className="map-list-title">{item.title || "Об'єкт"}</div>
              <div className="map-list-address">{item.address || 'Адреса не вказана'}</div>
              <div className="map-list-price">{formatMapPrice(item.price)}</div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default InteractiveMapPropertySidebar

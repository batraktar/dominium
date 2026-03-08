function InteractiveMapHeaderControls({
  themeId,
  themeOptions,
  onThemeChange,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-ermilov text-deepOcean">Інтерактивна карта (тест)</h1>
        <p className="text-sm sm:text-base font-fixel text-deepOcean/80 mt-2">
          Тестовий режим перегляду обʼєктів з координатами.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="map-style-select" className="inline-flex items-center gap-2">
          <span className="text-sm font-fixel text-deepOcean/80">Стиль карти</span>
          <select
            id="map-style-select"
            value={themeId}
            onChange={(event) => onThemeChange(event.target.value)}
            className="rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm font-fixel text-deepOcean focus:outline-none focus:ring-2 focus:ring-coolSage focus:border-coolSage"
          >
            {themeOptions.map(([id, theme]) => (
              <option key={id} value={id}>
                {theme.label || id}
              </option>
            ))}
          </select>
        </label>
        <a
          href="/search/"
          className="inline-flex items-center gap-2 rounded-[10px] bg-coolSage text-white px-4 py-2 font-fixel hover:bg-coolSage/90 transition"
        >
          <i className="ri-arrow-left-line"></i>
          Повернутись до пошуку
        </a>
      </div>
    </div>
  )
}

export default InteractiveMapHeaderControls

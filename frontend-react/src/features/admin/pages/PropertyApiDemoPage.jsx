import usePropertyApiDemoController from '../hooks/usePropertyApiDemoController.js'

function PropertyApiDemoPage() {
  const { output, isLoading, reload } = usePropertyApiDemoController()

  return (
    <section className="container mx-auto px-4 py-10 text-white">
      <h1 className="text-3xl font-ermilov mb-4">Перевірка API нерухомості</h1>
      <p className="text-coolSage font-fixel mb-6">
        Ця сторінка показує, як отримати дані з{' '}
        <code className="bg-black/20 px-1 rounded">/api/properties/</code>.
      </p>

      <div className="bg-white rounded-[9px] p-6 text-deepOcean shadow-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">Результати</h2>
        <p className="text-sm text-gray-500 mb-4">
          Сторінка робить запит одразу після завантаження. Натисніть кнопку, щоб оновити дані.
        </p>
        <button
          id="reload-properties"
          type="button"
          onClick={reload}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-deepOcean text-white rounded-[9px] font-fixel hover:bg-deepOcean/90 transition disabled:opacity-60"
        >
          <i className="ri-refresh-line"></i>
          Оновити список
        </button>
        <pre
          id="properties-output"
          className="bg-gray-900 text-gray-100 rounded-[9px] mt-4 p-4 overflow-x-auto text-sm"
        >
          {output}
        </pre>
      </div>

      <div className="bg-white rounded-[9px] p-6 text-deepOcean shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Доступні ендпоїнти</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm text-gray-700">
          <li>
            <code>/api/properties/</code> - список об&apos;єктів (GET), створення (POST)
          </li>
          <li>
            <code>/api/properties/&lt;id&gt;/</code> - перегляд, редагування, видалення
          </li>
          <li>
            <code>/api/property-types/</code> - довідник типів нерухомості
          </li>
          <li>
            <code>/api/deal-types/</code> - довідник типів угод
          </li>
          <li>
            <code>/api/features/</code> - доступні характеристики
          </li>
        </ul>
      </div>
    </section>
  )
}

export default PropertyApiDemoPage

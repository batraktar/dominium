function PropertyStaffActions({ propertyId }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <a
        href={`/api/admin/?edit=${propertyId}`}
        className="inline-flex items-center gap-2 px-4 py-2 bg-coolSage text-white rounded-[9px] font-fixel hover:bg-coolSage/90 transition"
      >
        <i className="ri-edit-2-line"></i>
        Редагувати обʼєкт
      </a>
      <a
        href="/api/admin/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-deepOcean text-white rounded-[9px] font-fixel hover:bg-deepOcean/90 transition"
      >
        <i className="ri-external-link-line"></i>
        Відкрити повну панель
      </a>
    </div>
  )
}

export default PropertyStaffActions

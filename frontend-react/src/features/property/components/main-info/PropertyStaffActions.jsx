function PropertyStaffActions({ propertyId, propertySlug }) {
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
        href={`/presentation/${encodeURIComponent(propertySlug)}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-deepOcean border border-deepOcean/20 rounded-[9px] font-fixel hover:bg-creamBeige/40 transition"
      >
        <i className="ri-file-pdf-2-line"></i>
        Презентація
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

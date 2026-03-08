function PropertyDescriptionBlock({ description = '' }) {
  return (
    <div className="border-t border-gray-200 py-6">
      <h3 className="text-xl font-ermilov text-deepOcean mb-4">Опис</h3>
      <div
        className="property-description font-fixel text-deepOcean leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: description || '<p>Опис обʼєкта буде додано найближчим часом.</p>',
        }}
      ></div>
    </div>
  )
}

export default PropertyDescriptionBlock

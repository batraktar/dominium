function PropertyFeaturesBlock({ features = [] }) {
  if (!Array.isArray(features) || !features.length) {
    return null
  }

  return (
    <div className="border-t border-gray-200 py-6">
      <h3 className="text-xl font-fixel mb-4">Зручності</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {features.map((feature) => (
          <div key={feature.id} className="flex items-center space-x-2">
            <i className="ri-checkbox-circle-line text-primary"></i>
            <span className="text-gray-600">{feature.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PropertyFeaturesBlock

function PropertySummaryStats({ property }) {
  return (
    <div className="flex flex-wrap font-fixel text-coolSage gap-4">
      {property.rooms ? (
        <div className="flex items-center">
          <i className="ri-hotel-bed-line text-coolSage mr-2"></i>
          <span>{property.rooms} кімнати</span>
        </div>
      ) : null}
      <div className="flex items-center">
        <i className="ri-ruler-line text-coolSage mr-2"></i>
        <span>{property.area || '—'} м²</span>
      </div>
      {property.property_type?.name ? (
        <div className="flex items-center">
          <i className="ri-building-line text-coolSage mr-2"></i>
          <span>{property.property_type.name}</span>
        </div>
      ) : null}
      {property.deal_type?.name ? (
        <div className="flex items-center">
          <i className="ri-file-list-line text-coolSage mr-2"></i>
          <span>{property.deal_type.name}</span>
        </div>
      ) : null}
    </div>
  )
}

export default PropertySummaryStats

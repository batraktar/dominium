import PropertyDescriptionBlock from './main-info/PropertyDescriptionBlock.jsx'
import PropertyFeaturesBlock from './main-info/PropertyFeaturesBlock.jsx'
import PropertyLocationMapCard from './PropertyLocationMapCard.jsx'
import PropertyStaffActions from './main-info/PropertyStaffActions.jsx'
import PropertySummaryStats from './main-info/PropertySummaryStats.jsx'

function PropertyMainInfoSection({
  property,
  userIsStaff = false,
  priceLabel,
  hasCoords = false,
  mapElementRef,
  basemap = 'satellite',
  onBasemapChange,
}) {
  return (
    <div className="lg:col-span-2">
      {userIsStaff ? <PropertyStaffActions propertyId={property.id} /> : null}

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-4 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-ermilov text-deepOcean mb-4 sm:mb-0">{priceLabel}</h2>
          <PropertySummaryStats property={property} />
        </div>

        <PropertyDescriptionBlock description={property.description} />
        <PropertyFeaturesBlock features={property.features} />
      </div>

      <PropertyLocationMapCard
        hasCoords={hasCoords}
        mapElementRef={mapElementRef}
        basemap={basemap}
        onBasemapChange={onBasemapChange}
      />
    </div>
  )
}

export default PropertyMainInfoSection

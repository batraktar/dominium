import { trackJourneyEvent } from '../../../../shared/analytics/journey.js'

function PropertyContactQuickActions({ propertyId = null }) {
  return (
    <div className="flex space-x-4 mt-6">
      <a
        href="tel:+380730032121"
        onClick={() => trackJourneyEvent('contact_click', { propertyId })}
        className="flex-1 flex items-center text-deepOcean font-ermilov justify-center space-x-2 border border-gray-200 py-2 !rounded-button hover:bg-gray-50"
      >
        <i className="ri-phone-line"></i>
        <span>Зателефонувати</span>
      </a>
    </div>
  )
}

export default PropertyContactQuickActions

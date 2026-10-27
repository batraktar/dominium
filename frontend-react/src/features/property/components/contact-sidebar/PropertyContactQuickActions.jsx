import { trackJourneyEvent } from '../../../../shared/analytics/journey.js'

function PropertyContactQuickActions({ propertyId = null }) {
  return (
    <div className="mb-5">
      <a
        href="tel:+380730032121"
        onClick={() => trackJourneyEvent('contact_click', { propertyId })}
        className="w-full flex items-center bg-deepOcean text-white font-ermilov justify-center space-x-2 py-3 !rounded-button shadow-md hover:bg-deepOcean/90 transition"
      >
        <i className="ri-phone-line"></i>
        <span>Зателефонувати</span>
      </a>
      <p className="mt-2 text-center text-xs text-deepOcean/70 font-fixel">Найшвидший спосіб дізнатися деталі об’єкта</p>
    </div>
  )
}

export default PropertyContactQuickActions

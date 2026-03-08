import logoBlack from '../../../../../../static/base/assets/img/Logoblack.png'
import PropertyContactSidebar from '../PropertyContactSidebar.jsx'
import PropertyMainInfoSection from '../PropertyMainInfoSection.jsx'

function PropertyPageDetailsGridSection({ mainInfoSectionProps, contactSidebarProps }) {
  return (
    <section className="content-section py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <PropertyMainInfoSection {...mainInfoSectionProps} />

          <PropertyContactSidebar logoSrc={logoBlack} {...contactSidebarProps} />
        </div>
      </div>
    </section>
  )
}

export default PropertyPageDetailsGridSection

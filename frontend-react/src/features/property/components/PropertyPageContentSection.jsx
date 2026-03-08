import PropertyPageDetailsGridSection from './content/PropertyPageDetailsGridSection.jsx'
import PropertyPageGalleryBlock from './content/PropertyPageGalleryBlock.jsx'

function PropertyPageContentSection({
  gallerySectionProps,
  mainInfoSectionProps,
  contactSidebarProps,
}) {
  return (
    <div className="pt-16">
      <PropertyPageGalleryBlock gallerySectionProps={gallerySectionProps} />

      <PropertyPageDetailsGridSection
        mainInfoSectionProps={mainInfoSectionProps}
        contactSidebarProps={contactSidebarProps}
      />
    </div>
  )
}

export default PropertyPageContentSection

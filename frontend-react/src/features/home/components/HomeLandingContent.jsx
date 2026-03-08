import HomeAboutSection from './HomeAboutSection.jsx'
import HomeContactSection from './HomeContactSection.jsx'
import HomeFeaturedPropertiesSection from './HomeFeaturedPropertiesSection.jsx'
import HomeHeroSection from './HomeHeroSection.jsx'

function HomeLandingContent({
  featuredProperties = [],
  onContactSubmit,
  isSendingConsultation = false,
  consultationMessage = '',
  consultationError = false,
}) {
  return (
    <>
      <HomeHeroSection />
      <HomeFeaturedPropertiesSection featuredProperties={featuredProperties} />
      <HomeAboutSection />
      <HomeContactSection
        onContactSubmit={onContactSubmit}
        isSendingConsultation={isSendingConsultation}
        consultationMessage={consultationMessage}
        consultationError={consultationError}
      />
    </>
  )
}

export default HomeLandingContent

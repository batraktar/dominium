import PropertyContactSuccessModal from '../components/PropertyContactSuccessModal.jsx'
import PropertyPageErrorState from '../components/PropertyPageErrorState.jsx'
import PropertyPageLoadingState from '../components/PropertyPageLoadingState.jsx'
import PropertyPageContentSection from '../components/PropertyPageContentSection.jsx'
import usePropertyDetailController from '../hooks/usePropertyDetailController.js'
import usePropertyDetailPageViewModel from '../hooks/usePropertyDetailPageViewModel.js'
import usePropertyMapController from '../hooks/usePropertyMapController.js'

function PropertyDetailPage({
  userIsStaff = false,
  userIsAuthenticated = false,
  userDisplayName = '',
  userEmail = '',
  userPhone = '',
}) {
  const controller = usePropertyDetailController({
    userIsAuthenticated,
    userDisplayName,
    userEmail,
    userPhone,
  })

  const { mapElementRef, basemap, setBasemap } = usePropertyMapController({
    property: controller.page.property,
    hasCoords: controller.page.hasCoords,
  })

  const { isLoading, loadError, property, csrfToken, contentSectionProps, successModalProps } =
    usePropertyDetailPageViewModel({
      userIsStaff,
      controller,
      mapController: {
        mapElementRef,
        basemap,
        setBasemap,
      },
    })

  if (isLoading) {
    return <PropertyPageLoadingState />
  }

  if (loadError || !property) {
    return <PropertyPageErrorState message={loadError || 'Обʼєкт не знайдено.'} />
  }

  return (
    <>
      <input type="hidden" id="form-csrf-token" value={csrfToken} />
      <PropertyPageContentSection {...contentSectionProps} />
      <PropertyContactSuccessModal {...successModalProps} />
    </>
  )
}

export default PropertyDetailPage

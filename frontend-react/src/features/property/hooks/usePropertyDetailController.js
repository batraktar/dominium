import { useMemo } from 'react'
import {
  buildCurrentPropertyPageAbsoluteUrl,
  extractPropertySlugFromPathname,
  PROPERTY_FALLBACK_IMAGE_URL,
} from '../model/propertyDetailModel.js'
import usePropertyDetailBootstrapEffects from './property-detail/usePropertyDetailBootstrapEffects.js'
import usePropertyDetailContactActions from './property-detail/usePropertyDetailContactActions.js'
import usePropertyDetailDerivedState from './property-detail/usePropertyDetailDerivedState.js'
import usePropertyDetailLikeActions from './property-detail/usePropertyDetailLikeActions.js'
import usePropertyDetailLoadEffects from './property-detail/usePropertyDetailLoadEffects.js'
import usePropertyDetailShareActions from './property-detail/usePropertyDetailShareActions.js'
import usePropertyDetailState from './property-detail/usePropertyDetailState.js'
import usePropertyDetailToast from './property-detail/usePropertyDetailToast.js'
import usePropertyDetailUiEffects from './property-detail/usePropertyDetailUiEffects.js'

export default function usePropertyDetailController({
  userIsAuthenticated = false,
  userDisplayName = '',
  userEmail = '',
  userPhone = '',
}) {
  const slug = useMemo(() => extractPropertySlugFromPathname(window.location.pathname), [])
  const propertyPageUrl = useMemo(() => buildCurrentPropertyPageAbsoluteUrl(window.location.pathname), [])

  const state = usePropertyDetailState({
    userDisplayName,
    userEmail,
    userPhone,
  })

  usePropertyDetailBootstrapEffects({
    setCsrfToken: state.setCsrfToken,
    userDisplayName,
    userPhone,
    userEmail,
    contactNoEmail: state.contactNoEmail,
    setContactName: state.setContactName,
    setContactPhone: state.setContactPhone,
    setContactEmail: state.setContactEmail,
  })

  usePropertyDetailLoadEffects({
    slug,
    userIsAuthenticated,
    property: state.property,
    setProperty: state.setProperty,
    setIsLoading: state.setIsLoading,
    setLoadError: state.setLoadError,
    setMobileImageIndex: state.setMobileImageIndex,
    setModalImageIndex: state.setModalImageIndex,
    setLiked: state.setLiked,
  })

  const { galleryImages, activeMobileImage, activeModalImage, priceLabel, hasCoords } =
    usePropertyDetailDerivedState({
      property: state.property,
      mobileImageIndex: state.mobileImageIndex,
      modalImageIndex: state.modalImageIndex,
    })

  usePropertyDetailUiEffects({
    setOpenShareMenu: state.setOpenShareMenu,
    modalOpen: state.modalOpen,
    galleryImagesLength: galleryImages.length,
    setModalOpen: state.setModalOpen,
    setModalImageIndex: state.setModalImageIndex,
  })

  const { showToast } = usePropertyDetailToast({
    toastTimerRef: state.toastTimerRef,
  })

  const { handleShare } = usePropertyDetailShareActions({
    property: state.property,
    setOpenShareMenu: state.setOpenShareMenu,
    showToast,
  })

  const { toggleLike } = usePropertyDetailLikeActions({
    property: state.property,
    userIsAuthenticated,
    setLiked: state.setLiked,
    showToast,
  })

  const { handleContactSubmit, handleContactNoEmailChange } = usePropertyDetailContactActions({
    property: state.property,
    propertyPageUrl,
    isSendingContact: state.isSendingContact,
    contactName: state.contactName,
    contactPhone: state.contactPhone,
    contactEmail: state.contactEmail,
    contactNoEmail: state.contactNoEmail,
    contactMessage: state.contactMessage,
    userEmail,
    setIsSendingContact: state.setIsSendingContact,
    setContactMessage: state.setContactMessage,
    setContactEmail: state.setContactEmail,
    setContactNoEmail: state.setContactNoEmail,
    setShowSuccessModal: state.setShowSuccessModal,
    showToast,
  })

  const handleToggleShareMenu = () => {
    state.setOpenShareMenu((value) => !value)
  }

  return {
    page: {
      property: state.property,
      isLoading: state.isLoading,
      loadError: state.loadError,
      csrfToken: state.csrfToken,
      priceLabel,
      hasCoords,
      propertyPageUrl,
      fallbackImageUrl: PROPERTY_FALLBACK_IMAGE_URL,
    },
    gallery: {
      liked: state.liked,
      openShareMenu: state.openShareMenu,
      mobileImageIndex: state.mobileImageIndex,
      modalOpen: state.modalOpen,
      modalImageIndex: state.modalImageIndex,
      galleryImages,
      activeMobileImage,
      activeModalImage,
      setOpenShareMenu: state.setOpenShareMenu,
      setMobileImageIndex: state.setMobileImageIndex,
      setModalOpen: state.setModalOpen,
      setModalImageIndex: state.setModalImageIndex,
      handleToggleShareMenu,
      handleShare,
      toggleLike,
    },
    contact: {
      contactName: state.contactName,
      setContactName: state.setContactName,
      contactPhone: state.contactPhone,
      setContactPhone: state.setContactPhone,
      contactEmail: state.contactEmail,
      setContactEmail: state.setContactEmail,
      contactNoEmail: state.contactNoEmail,
      contactMessage: state.contactMessage,
      setContactMessage: state.setContactMessage,
      isSendingContact: state.isSendingContact,
      showSuccessModal: state.showSuccessModal,
      setShowSuccessModal: state.setShowSuccessModal,
      handleContactNoEmailChange,
      handleContactSubmit,
    },
  }
}

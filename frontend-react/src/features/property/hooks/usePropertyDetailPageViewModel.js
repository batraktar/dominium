export default function usePropertyDetailPageViewModel({
  userIsStaff = false,
  controller,
  mapController,
}) {
  const handleContactNameChange = (event) => {
    controller.contact.setContactName(event.target.value)
  }

  const handleContactPhoneChange = (event) => {
    controller.contact.setContactPhone(event.target.value)
  }

  const handleContactEmailChange = (event) => {
    controller.contact.setContactEmail(event.target.value)
  }

  const handleContactMessageChange = (event) => {
    controller.contact.setContactMessage(event.target.value)
  }

  const handleCloseSuccessModal = () => {
    controller.contact.setShowSuccessModal(false)
  }

  return {
    isLoading: controller.page.isLoading,
    loadError: controller.page.loadError,
    property: controller.page.property,
    csrfToken: controller.page.csrfToken,
    contentSectionProps: {
      gallerySectionProps: {
        property: controller.page.property,
        galleryImages: controller.gallery.galleryImages,
        activeMobileImage: controller.gallery.activeMobileImage,
        activeModalImage: controller.gallery.activeModalImage,
        fallbackImageUrl: controller.page.fallbackImageUrl,
        liked: controller.gallery.liked,
        openShareMenu: controller.gallery.openShareMenu,
        mobileImageIndex: controller.gallery.mobileImageIndex,
        modalOpen: controller.gallery.modalOpen,
        modalImageIndex: controller.gallery.modalImageIndex,
        onToggleLike: controller.gallery.toggleLike,
        onToggleShareMenu: controller.gallery.handleToggleShareMenu,
        onShare: controller.gallery.handleShare,
        onMobileImageIndexChange: controller.gallery.setMobileImageIndex,
        onModalOpenChange: controller.gallery.setModalOpen,
        onModalImageIndexChange: controller.gallery.setModalImageIndex,
      },
      mainInfoSectionProps: {
        property: controller.page.property,
        userIsStaff,
        priceLabel: controller.page.priceLabel,
        hasCoords: controller.page.hasCoords,
        mapElementRef: mapController.mapElementRef,
        basemap: mapController.basemap,
        onBasemapChange: mapController.setBasemap,
      },
      contactSidebarProps: {
        contactName: controller.contact.contactName,
        onContactNameChange: handleContactNameChange,
        contactPhone: controller.contact.contactPhone,
        onContactPhoneChange: handleContactPhoneChange,
        contactEmail: controller.contact.contactEmail,
        onContactEmailChange: handleContactEmailChange,
        contactNoEmail: controller.contact.contactNoEmail,
        onContactNoEmailChange: controller.contact.handleContactNoEmailChange,
        contactMessage: controller.contact.contactMessage,
        onContactMessageChange: handleContactMessageChange,
        propertyUrl: controller.page.propertyPageUrl,
        isSendingContact: controller.contact.isSendingContact,
        onSubmit: controller.contact.handleContactSubmit,
      },
    },
    successModalProps: {
      isOpen: controller.contact.showSuccessModal,
      onClose: handleCloseSuccessModal,
    },
  }
}

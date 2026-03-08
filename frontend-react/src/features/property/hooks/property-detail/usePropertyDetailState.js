import { useRef, useState } from 'react'

export default function usePropertyDetailState({
  userDisplayName = '',
  userEmail = '',
  userPhone = '',
}) {
  const [property, setProperty] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [liked, setLiked] = useState(false)
  const [openShareMenu, setOpenShareMenu] = useState(false)

  const [mobileImageIndex, setMobileImageIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalImageIndex, setModalImageIndex] = useState(0)

  const [contactName, setContactName] = useState(userDisplayName || '')
  const [contactPhone, setContactPhone] = useState(userPhone || '')
  const [contactEmail, setContactEmail] = useState(userEmail || '')
  const [contactNoEmail, setContactNoEmail] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [isSendingContact, setIsSendingContact] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')

  const toastTimerRef = useRef(null)

  return {
    property,
    setProperty,
    isLoading,
    setIsLoading,
    loadError,
    setLoadError,
    liked,
    setLiked,
    openShareMenu,
    setOpenShareMenu,
    mobileImageIndex,
    setMobileImageIndex,
    modalOpen,
    setModalOpen,
    modalImageIndex,
    setModalImageIndex,
    contactName,
    setContactName,
    contactPhone,
    setContactPhone,
    contactEmail,
    setContactEmail,
    contactNoEmail,
    setContactNoEmail,
    contactMessage,
    setContactMessage,
    isSendingContact,
    setIsSendingContact,
    showSuccessModal,
    setShowSuccessModal,
    csrfToken,
    setCsrfToken,
    toastTimerRef,
  }
}

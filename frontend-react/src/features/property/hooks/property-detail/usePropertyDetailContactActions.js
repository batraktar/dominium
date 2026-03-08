import { sendConsultation } from '../../services/propertyApi.js'
import { extractPropertyUiErrorMessage } from './propertyDetailErrors.js'

export default function usePropertyDetailContactActions({
  property,
  propertyPageUrl,
  isSendingContact = false,
  contactName = '',
  contactPhone = '',
  contactEmail = '',
  contactNoEmail = false,
  contactMessage = '',
  userEmail = '',
  setIsSendingContact,
  setContactMessage,
  setContactEmail,
  setContactNoEmail,
  setShowSuccessModal,
  showToast,
}) {
  const handleContactSubmit = async (event) => {
    event.preventDefault()
    if (!property || isSendingContact) return

    setIsSendingContact(true)
    try {
      await sendConsultation({
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactNoEmail ? '' : contactEmail.trim(),
        message: contactMessage.trim(),
        property: propertyPageUrl,
      })

      setContactMessage('')
      if (contactNoEmail) setContactEmail('')
      setShowSuccessModal(true)
    } catch (error) {
      if (error?.status) {
        showToast(extractPropertyUiErrorMessage(error, 'Сталася помилка.'), true)
      } else {
        showToast("Помилка з'єднання з сервером.", true)
      }
    } finally {
      setIsSendingContact(false)
    }
  }

  const handleContactNoEmailChange = (event) => {
    setContactNoEmail(event.target.checked)
    if (event.target.checked) {
      setContactEmail('')
    } else if (userEmail) {
      setContactEmail(userEmail)
    }
  }

  return {
    handleContactSubmit,
    handleContactNoEmailChange,
  }
}

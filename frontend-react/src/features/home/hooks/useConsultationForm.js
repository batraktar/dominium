import { useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'

function useConsultationForm() {
  const [isSendingConsultation, setIsSendingConsultation] = useState(false)
  const [consultationMessage, setConsultationMessage] = useState('')
  const [consultationError, setConsultationError] = useState(false)

  const handleContactSubmit = async (event) => {
    event.preventDefault()
    if (isSendingConsultation) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = new URLSearchParams()
    for (const [key, value] of formData.entries()) {
      payload.append(key, String(value))
    }

    setIsSendingConsultation(true)
    setConsultationMessage('')
    setConsultationError(false)

    try {
      await apiClient.postForm(apiEndpoints.consultation, payload)

      form.reset()
      setConsultationError(false)
      setConsultationMessage('Ваше повідомлення надіслано. Ми скоро з вами звʼяжемося.')
    } catch (error) {
      setConsultationError(true)
      const fallbackMessage = 'Не вдалося надіслати форму. Спробуйте ще раз.'
      const message =
        error?.code && error.code !== 'network_error'
          ? error?.message || fallbackMessage
          : fallbackMessage
      setConsultationMessage(message)
    } finally {
      setIsSendingConsultation(false)
    }
  }

  return {
    handleContactSubmit,
    isSendingConsultation,
    consultationMessage,
    consultationError,
  }
}

export default useConsultationForm

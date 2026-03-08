import { useEffect } from 'react'
import { ensureCsrfToken } from '../../../../shared/utils/csrf.js'

export default function usePropertyDetailBootstrapEffects({
  setCsrfToken,
  userDisplayName = '',
  userPhone = '',
  userEmail = '',
  contactNoEmail = false,
  setContactName,
  setContactPhone,
  setContactEmail,
}) {
  useEffect(() => {
    let cancelled = false

    const bootstrapCsrf = async () => {
      const token = await ensureCsrfToken()
      if (!cancelled) {
        setCsrfToken(token || '')
      }
    }

    bootstrapCsrf()

    return () => {
      cancelled = true
    }
  }, [setCsrfToken])

  useEffect(() => {
    if (userDisplayName) setContactName(userDisplayName)
    if (userPhone) setContactPhone(userPhone)
    if (userEmail && !contactNoEmail) setContactEmail(userEmail)
  }, [
    contactNoEmail,
    setContactEmail,
    setContactName,
    setContactPhone,
    userDisplayName,
    userEmail,
    userPhone,
  ])
}

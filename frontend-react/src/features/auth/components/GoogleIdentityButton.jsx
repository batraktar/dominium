import { useEffect, useRef, useState } from 'react'
import apiClient from '../../../shared/api/client.js'
import { apiEndpoints } from '../../../shared/api/endpoints.js'
import {
  exchangeGoogleCredential,
  loadGoogleIdentityScript,
} from '../utils/googleIdentity.js'
import { trackJourneyEvent } from '../../../shared/analytics/journey.js'

function GoogleIdentityButton({ onAuthenticated, onError, fallbackUrl }) {
  const containerRef = useRef(null)
  const callbackRef = useRef({ onAuthenticated, onError })
  const [fallback, setFallback] = useState(false)
  const [busy, setBusy] = useState(true)

  callbackRef.current = { onAuthenticated, onError }

  useEffect(() => {
    let mounted = true

    async function setup() {
      try {
        const { data: config } = await apiClient.get(apiEndpoints.googleIdentityConfig, {
          retry: 1,
        })
        if (!mounted) return
        if (!config?.enabled || !config?.client_id) {
          setFallback(true)
          return
        }

        const google = await loadGoogleIdentityScript()
        if (!mounted || !containerRef.current) return

        google.accounts.id.initialize({
          client_id: config.client_id,
          callback: async (response) => {
            await trackJourneyEvent('auth_start', { metadata: { provider: 'google' } })
            try {
              const session = await exchangeGoogleCredential(response?.credential)
              if (session) {
                await trackJourneyEvent('auth_success', { metadata: { provider: 'google' } })
                callbackRef.current.onAuthenticated?.(session)
              }
            } catch (error) {
              await trackJourneyEvent('auth_failure', { metadata: { provider: 'google', reason: 'exchange_failed' } })
              callbackRef.current.onError?.(
                error?.message || 'Не вдалося увійти через Google. Спробуйте ще раз.',
              )
            }
          },
        })
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 360,
          locale: 'uk',
        })
      } catch {
        if (mounted) setFallback(true)
      } finally {
        if (mounted) setBusy(false)
      }
    }

    setup()
    return () => { mounted = false }
  }, [])

  if (fallback) {
    return (
      <button
        type="button"
        data-google-auth
        data-auth-url={fallbackUrl}
        className="w-full flex items-center justify-center px-4 py-3 rounded-full border border-gray-300 bg-white hover:border-primary hover:shadow transition"
      >
        Продовжити з Google
      </button>
    )
  }

  return (
    <div className={busy ? 'min-h-11 opacity-60' : 'min-h-11'} aria-busy={busy}>
      <div ref={containerRef} className="flex justify-center" aria-label="Продовжити з Google" />
    </div>
  )
}

export default GoogleIdentityButton

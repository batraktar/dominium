export class UiError extends Error {
  constructor({
    message = 'Сталася помилка.',
    code = 'unknown_error',
    status = 0,
    errors = null,
    isNetworkError = false,
    isTimeout = false,
    cause,
  } = {}) {
    super(message)
    this.name = 'UiError'
    this.code = code
    this.status = status
    this.errors = errors
    this.isNetworkError = isNetworkError
    this.isTimeout = isTimeout
    if (cause) {
      this.cause = cause
    }
  }
}

function resolveErrorCode(status, payloadCode) {
  if (payloadCode) return String(payloadCode)
  if (status === 400 || status === 422) return 'validation_error'
  if (status === 401) return 'auth_required'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'server_error'
  return 'unknown_error'
}

export function extractApiMessage(payload, fallbackMessage = 'Сталася помилка.') {
  if (!payload) return fallbackMessage

  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }

  if (Array.isArray(payload?.errors)) {
    const firstError = payload.errors.find((item) => typeof item === 'string' && item.trim())
    if (firstError) return firstError.trim()
  }

  if (payload?.errors && typeof payload.errors === 'object') {
    const allEntries = Object.values(payload.errors).flat()
    const firstEntry = allEntries.find((item) => typeof item === 'string' && item.trim())
    if (firstEntry) return firstEntry.trim()
  }

  if (typeof payload?.detail === 'string' && payload.detail.trim()) {
    return payload.detail.trim()
  }

  if (typeof payload?.error === 'string' && payload.error.trim()) {
    return payload.error.trim()
  }

  return fallbackMessage
}

export function toUiErrorFromResponse(response, payload, fallbackMessage = 'Сталася помилка.') {
  const status = Number(response?.status || 0)
  const message = extractApiMessage(payload, fallbackMessage)
  const code = resolveErrorCode(status, payload?.code)

  return new UiError({
    message,
    code,
    status,
    errors: payload?.errors ?? null,
    isNetworkError: false,
    isTimeout: false,
  })
}

export function isAbortError(error) {
  if (!error) return false
  return error.name === 'AbortError' || error.code === 'aborted'
}

export function toUiError(error, fallbackMessage = "Помилка з'єднання з сервером.") {
  if (error instanceof UiError) {
    return error
  }

  if (isAbortError(error)) {
    return new UiError({
      message: 'Запит було скасовано.',
      code: 'aborted',
      status: 0,
      isNetworkError: false,
      isTimeout: false,
      cause: error,
    })
  }

  return new UiError({
    message: fallbackMessage,
    code: 'network_error',
    status: 0,
    isNetworkError: true,
    isTimeout: false,
    cause: error,
  })
}

import { ensureCsrfToken } from '../utils/csrf.js'
import { UiError, isAbortError, toUiError, toUiErrorFromResponse } from '../utils/api-error.js'

const DEFAULT_TIMEOUT_MS = 15000
const RETRY_BASE_DELAY_MS = 250
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function normalizeQuery(query) {
  if (!query) return ''
  if (query instanceof URLSearchParams) return query.toString()

  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value == null) return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item == null) return
        params.append(key, String(item))
      })
      return
    }
    params.append(key, String(value))
  })
  return params.toString()
}

function buildUrl(path, query) {
  const queryString = normalizeQuery(query)
  if (!queryString) return path
  return path.includes('?') ? `${path}&${queryString}` : `${path}?${queryString}`
}

function buildFormBody(form) {
  if (form == null) return undefined
  if (form instanceof URLSearchParams) return form.toString()
  if (form instanceof FormData) return form

  const params = new URLSearchParams()
  Object.entries(form).forEach(([key, value]) => {
    if (value == null) return
    params.append(key, String(value))
  })
  return params.toString()
}

function createRequestSignal(signal, timeoutMs) {
  const hasTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
  if (!hasTimeout && !signal) {
    return {
      signal: undefined,
      didTimeout: () => false,
      cleanup: () => {},
    }
  }

  let timeoutTriggered = false
  const controller = new AbortController()
  const cleanups = []

  if (hasTimeout) {
    const timeoutId = window.setTimeout(() => {
      timeoutTriggered = true
      controller.abort()
    }, timeoutMs)
    cleanups.push(() => window.clearTimeout(timeoutId))
  }

  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      const onAbort = () => controller.abort()
      signal.addEventListener('abort', onAbort, { once: true })
      cleanups.push(() => signal.removeEventListener('abort', onAbort))
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timeoutTriggered,
    cleanup: () => cleanups.forEach((cleanup) => cleanup()),
  }
}

async function parseResponseBody(response, parseAs = 'json') {
  if (parseAs === 'text') {
    return response.text()
  }
  if (parseAs === 'raw') {
    return null
  }
  return response.json().catch(() => null)
}

function shouldRetry({ attempt, retry, method, error }) {
  if (attempt >= retry) return false
  if (!SAFE_METHODS.has(method)) return false
  if (isAbortError(error)) return false

  if (error instanceof UiError) {
    if (error.isTimeout || error.isNetworkError) return true
    if (error.status >= 500) return true
  }
  return false
}

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const query = options.query
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retry = Math.max(0, Number(options.retry || 0))
  const parseAs = options.parseAs || 'json'
  const withRequestedWith = options.withRequestedWith ?? true
  const withJsonAccept = options.withJsonAccept ?? true
  const withCredentials = options.withCredentials ?? 'same-origin'

  const url = buildUrl(path, query)
  const headers = new Headers(options.headers || {})
  if (withRequestedWith && !headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest')
  }
  if (withJsonAccept && !headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  let body = options.body
  if (options.json !== undefined) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    body = JSON.stringify(options.json)
  } else if (options.form !== undefined) {
    body = buildFormBody(options.form)
    if (typeof body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded')
    }
  }

  if (options.csrf) {
    const csrfToken = await ensureCsrfToken()
    if (csrfToken && !headers.has('X-CSRFToken')) {
      headers.set('X-CSRFToken', csrfToken)
    }
  }

  let attempt = 0
  while (attempt <= retry) {
    const { signal, didTimeout, cleanup } = createRequestSignal(options.signal, timeoutMs)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        credentials: withCredentials,
        signal,
      })

      const data = await parseResponseBody(response, parseAs)

      if (!response.ok) {
        throw toUiErrorFromResponse(response, data)
      }

      return {
        data,
        status: response.status,
        response,
      }
    } catch (error) {
      if (didTimeout()) {
        const timeoutError = new UiError({
          message: 'Час очікування відповіді вичерпано.',
          code: 'timeout',
          status: 0,
          isTimeout: true,
          isNetworkError: false,
          cause: error,
        })
        if (!shouldRetry({ attempt, retry, method, error: timeoutError })) {
          throw timeoutError
        }
      } else if (!shouldRetry({ attempt, retry, method, error })) {
        if (isAbortError(error)) {
          throw error
        }
        throw toUiError(error)
      }

      attempt += 1
      await delay(RETRY_BASE_DELAY_MS * attempt)
    } finally {
      cleanup()
    }
  }

  throw new UiError({
    message: 'Не вдалося виконати запит.',
    code: 'request_failed',
    status: 0,
  })
}

function get(path, options = {}) {
  return request(path, {
    ...options,
    method: 'GET',
  })
}

function post(path, options = {}) {
  return request(path, {
    ...options,
    method: 'POST',
    csrf: options.csrf ?? true,
  })
}

function postForm(path, form, options = {}) {
  return post(path, {
    ...options,
    form,
  })
}

function postJson(path, json, options = {}) {
  return post(path, {
    ...options,
    json,
  })
}

export const apiClient = {
  request,
  get,
  post,
  postForm,
  postJson,
}

export default apiClient

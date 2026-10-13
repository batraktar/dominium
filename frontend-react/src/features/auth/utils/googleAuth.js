export function submitGoogleAuthInCurrentTab({
  authUrl,
  nextPath,
  csrfToken,
  origin,
  documentObject = document,
}) {
  if (!csrfToken) {
    throw new Error('A CSRF token is required to start Google sign-in.')
  }

  const action = new URL(authUrl, origin)
  if (action.origin !== origin) {
    throw new Error('The Google sign-in endpoint must be same origin.')
  }

  let safeNextPath = '/'
  try {
    const nextUrl = new URL(nextPath || '/', origin)
    if (nextUrl.origin === origin) {
      safeNextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    }
  } catch {
    // Keep the safe root fallback for malformed return paths.
  }

  action.searchParams.set('process', 'login')
  action.searchParams.set('next', safeNextPath)

  const form = documentObject.createElement('form')
  form.method = 'post'
  form.action = action.toString()
  form.target = '_self'
  form.hidden = true

  const tokenInput = documentObject.createElement('input')
  tokenInput.type = 'hidden'
  tokenInput.name = 'csrfmiddlewaretoken'
  tokenInput.value = csrfToken
  form.appendChild(tokenInput)

  documentObject.body.appendChild(form)
  form.submit()
}

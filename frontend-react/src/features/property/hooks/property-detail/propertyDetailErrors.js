export function extractPropertyUiErrorMessage(error, fallback = 'Сталася помилка.') {
  if (Array.isArray(error?.errors) && error.errors.length) {
    const messages = error.errors.filter((item) => typeof item === 'string' && item.trim())
    if (messages.length) return messages.join('\n')
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }
  return fallback
}

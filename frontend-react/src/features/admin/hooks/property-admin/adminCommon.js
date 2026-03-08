export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatAdminError(error, fallback = 'Сталася помилка.') {
  if (!error) return fallback

  if (Array.isArray(error?.errors)) {
    const lines = error.errors
      .map((entry) => (typeof entry === 'string' ? entry : entry?.error || ''))
      .filter(Boolean)
    if (lines.length) return lines.join('\n')
  }

  if (error?.errors && typeof error.errors === 'object') {
    const lines = Object.values(error.errors)
      .flat()
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
    if (lines.length) return lines.join('\n')
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim()
  }

  return fallback
}

export function applyStatus(node, message, type = 'info') {
  if (!node) return

  node.textContent = message
  node.classList.remove(
    'hidden',
    'bg-green-100',
    'bg-red-100',
    'bg-yellow-100',
    'text-green-800',
    'text-red-800',
    'text-yellow-800',
  )

  const map = {
    success: ['bg-green-100', 'text-green-800'],
    error: ['bg-red-100', 'text-red-800'],
    info: ['bg-yellow-100', 'text-yellow-800'],
  }

  ;(map[type] || map.info).forEach((className) => node.classList.add(className))
}

export function clearStatus(node) {
  if (!node) return
  node.classList.add('hidden')
  node.textContent = ''
  node.classList.remove(
    'bg-green-100',
    'bg-red-100',
    'bg-yellow-100',
    'text-green-800',
    'text-red-800',
    'text-yellow-800',
  )
}

export function applyTableStatus(node, message, type = 'info') {
  if (!node) return

  node.textContent = message
  node.classList.remove(
    'hidden',
    'bg-green-50',
    'bg-red-50',
    'bg-gray-50',
    'text-green-800',
    'text-red-800',
    'text-gray-700',
    'border-green-200',
    'border-red-200',
    'border-gray-200',
  )

  const map = {
    success: ['bg-green-50', 'text-green-800', 'border-green-200'],
    error: ['bg-red-50', 'text-red-800', 'border-red-200'],
    info: ['bg-gray-50', 'text-gray-700', 'border-gray-200'],
  }

  ;(map[type] || map.info).forEach((className) => node.classList.add(className))
}

export function clearTableStatus(node) {
  if (!node) return

  node.classList.add('hidden')
  node.textContent = ''
  node.classList.remove(
    'bg-green-50',
    'bg-red-50',
    'bg-gray-50',
    'text-green-800',
    'text-red-800',
    'text-gray-700',
    'border-green-200',
    'border-red-200',
    'border-gray-200',
  )
}

export function fillSelect(selectNode, items, placeholder) {
  if (!selectNode) return

  selectNode.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`
  items.forEach((item) => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    selectNode.append(option)
  })
}

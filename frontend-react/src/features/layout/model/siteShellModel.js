export function getPrimaryNavKey(pathname = '/') {
  const path = String(pathname || '/')
  if (path === '/') return 'home'
  if (path.startsWith('/search')) return 'search'
  if (path.startsWith('/likes')) return 'likes'
  if (path === '/api/admin' || path.startsWith('/api/admin/')) return 'admin'
  return ''
}

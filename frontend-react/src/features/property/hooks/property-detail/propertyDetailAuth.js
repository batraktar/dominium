function getCurrentPathForAuth() {
  return `${window.location.pathname}${window.location.search}`
}

function requestPropertyAuth(next = getCurrentPathForAuth()) {
  window.dispatchEvent(
    new CustomEvent('dominium:auth-required', {
      detail: { next },
    }),
  )
}

export { getCurrentPathForAuth, requestPropertyAuth }

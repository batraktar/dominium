import { buildAbsoluteUrl } from '../../utils/likesPageUtils.js'

export default function useLikesShareActions({
  setOpenShareMenuId,
  showToast,
}) {
  const handleToggleShareMenu = (propertyId) => {
    setOpenShareMenuId((previous) => (previous === propertyId ? null : propertyId))
  }

  const handleShare = async (action, property) => {
    setOpenShareMenuId(null)
    const absoluteUrl = buildAbsoluteUrl(
      property.absolute_url || (property.slug ? `/property/${property.slug}/` : '/search/'),
    )
    const title = property.title || document.title

    if (action === 'copy') {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(absoluteUrl)
        } else {
          const input = document.createElement('input')
          input.value = absoluteUrl
          document.body.appendChild(input)
          input.select()
          document.execCommand('copy')
          document.body.removeChild(input)
        }
        showToast('Посилання скопійовано')
      } catch {
        showToast('Не вдалося скопіювати посилання', true)
      }
      return
    }

    if (action === 'telegram') {
      const url = encodeURIComponent(absoluteUrl)
      const text = encodeURIComponent(title)
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener')
      return
    }

    if (action === 'viber') {
      const text = encodeURIComponent(`${title}\n${absoluteUrl}`)
      const deepLink = `viber://forward?text=${text}`
      const opened = window.open(deepLink, '_blank')
      if (!opened) {
        window.open(`https://viber.click?number=&text=${text}`, '_blank', 'noopener')
      }
    }
  }

  return {
    handleToggleShareMenu,
    handleShare,
  }
}

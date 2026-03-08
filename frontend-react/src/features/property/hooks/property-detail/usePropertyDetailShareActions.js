import { buildPropertyAbsoluteUrl } from '../../model/propertyDetailModel.js'

export default function usePropertyDetailShareActions({
  property,
  setOpenShareMenu,
  showToast,
}) {
  const handleShare = async (action) => {
    if (!property) return

    const absoluteUrl = buildPropertyAbsoluteUrl(property)
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
      } finally {
        setOpenShareMenu(false)
      }
      return
    }

    if (action === 'telegram') {
      const url = encodeURIComponent(absoluteUrl)
      const text = encodeURIComponent(title)
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener')
      setOpenShareMenu(false)
      return
    }

    if (action === 'viber') {
      const text = encodeURIComponent(`${title}\n${absoluteUrl}`)
      const deepLink = `viber://forward?text=${text}`
      const opened = window.open(deepLink, '_blank')
      if (!opened) {
        window.open(`https://viber.click?number=&text=${text}`, '_blank', 'noopener')
      }
      setOpenShareMenu(false)
    }
  }

  return {
    handleShare,
  }
}

import { useEffect } from 'react'
import { buildPropertyDocumentTitle } from '../../model/propertyDetailModel.js'
import { getLikedPropertyIds, getPropertyBySlug } from '../../services/propertyApi.js'

export default function usePropertyDetailLoadEffects({
  slug = '',
  userIsAuthenticated = false,
  property,
  setProperty,
  setIsLoading,
  setLoadError,
  setMobileImageIndex,
  setModalImageIndex,
  setLiked,
}) {
  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      setLoadError('Некоректна адреса обʼєкта.')
      return undefined
    }

    let cancelled = false
    const abortController = new AbortController()

    const loadProperty = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const result = await getPropertyBySlug(slug, { signal: abortController.signal })
        if (cancelled) return

        setProperty(result)
        setMobileImageIndex(0)
        setModalImageIndex(0)
        document.title = buildPropertyDocumentTitle(result)
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return

        if (error?.status === 404) {
          setLoadError('Обʼєкт не знайдено.')
        } else {
          setLoadError('Не вдалося завантажити обʼєкт. Спробуйте ще раз.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadProperty()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [
    setIsLoading,
    setLoadError,
    setModalImageIndex,
    setMobileImageIndex,
    setProperty,
    slug,
  ])

  useEffect(() => {
    if (!property || !userIsAuthenticated) return undefined

    let cancelled = false
    const abortController = new AbortController()

    const loadLiked = async () => {
      try {
        const ids = await getLikedPropertyIds({ signal: abortController.signal })
        if (cancelled) return
        setLiked(ids.includes(Number(property.id)))
      } catch (error) {
        if (error?.name === 'AbortError') return
        // Ignore background like preload errors.
      }
    }

    loadLiked()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [property, setLiked, userIsAuthenticated])
}

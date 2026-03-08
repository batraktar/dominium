import { useMemo } from 'react'
import {
  buildPropertyGalleryImages,
  buildPropertyPriceLabel,
  hasPropertyCoordinates,
} from '../../model/propertyDetailModel.js'

export default function usePropertyDetailDerivedState({
  property,
  mobileImageIndex,
  modalImageIndex,
}) {
  const galleryImages = useMemo(() => buildPropertyGalleryImages(property), [property])
  const activeMobileImage = galleryImages[mobileImageIndex] || galleryImages[0]
  const activeModalImage = galleryImages[modalImageIndex] || galleryImages[0]
  const priceLabel = useMemo(() => buildPropertyPriceLabel(property), [property])
  const hasCoords = useMemo(() => hasPropertyCoordinates(property), [property])

  return {
    galleryImages,
    activeMobileImage,
    activeModalImage,
    priceLabel,
    hasCoords,
  }
}

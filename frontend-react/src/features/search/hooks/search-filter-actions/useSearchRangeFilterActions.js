import {
  AREA_RANGE_CONFIG,
  PRICE_RANGE_CONFIG,
  ROOMS_RANGE_CONFIG,
} from '../../constants/searchConfig.js'
import { clamp, parseIntOr } from '../../utils/searchPageUtils.js'

function buildNextRange({ currentRange, boundary, config, nextValue }) {
  if (boundary === 'min') {
    const allowedMin = Math.min(nextValue, currentRange.max - config.step)
    return {
      min: clamp(allowedMin, config.min, config.max),
      max: currentRange.max,
    }
  }

  const allowedMax = Math.max(nextValue, currentRange.min + config.step)
  return {
    min: currentRange.min,
    max: clamp(allowedMax, config.min, config.max),
  }
}

export default function useSearchRangeFilterActions({
  priceRange,
  areaRange,
  roomsRange,
  setPriceRange,
  setAreaRange,
  setRoomsRange,
  setPage,
}) {
  const applyNextRange = ({ currentRange, boundary, config, nextValue, setRange }) => {
    const nextRange = buildNextRange({
      currentRange,
      boundary,
      config,
      nextValue,
    })
    setRange(nextRange)
    setPage(1)
  }

  const resetPriceRange = () => {
    setPriceRange({ min: PRICE_RANGE_CONFIG.min, max: PRICE_RANGE_CONFIG.max })
    setPage(1)
  }

  const resetAreaRange = () => {
    setAreaRange({ min: AREA_RANGE_CONFIG.min, max: AREA_RANGE_CONFIG.max })
    setPage(1)
  }

  const resetRoomsRange = () => {
    setRoomsRange({ min: ROOMS_RANGE_CONFIG.min, max: ROOMS_RANGE_CONFIG.max })
    setPage(1)
  }

  const handlePriceMinInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, priceRange.min)
    applyNextRange({
      currentRange: priceRange,
      boundary: 'min',
      config: PRICE_RANGE_CONFIG,
      nextValue,
      setRange: setPriceRange,
    })
  }

  const handlePriceMaxInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, priceRange.max)
    applyNextRange({
      currentRange: priceRange,
      boundary: 'max',
      config: PRICE_RANGE_CONFIG,
      nextValue,
      setRange: setPriceRange,
    })
  }

  const handleAreaMinInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, areaRange.min)
    applyNextRange({
      currentRange: areaRange,
      boundary: 'min',
      config: AREA_RANGE_CONFIG,
      nextValue,
      setRange: setAreaRange,
    })
  }

  const handleAreaMaxInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, areaRange.max)
    applyNextRange({
      currentRange: areaRange,
      boundary: 'max',
      config: AREA_RANGE_CONFIG,
      nextValue,
      setRange: setAreaRange,
    })
  }

  const handleRoomsMinInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, roomsRange.min)
    applyNextRange({
      currentRange: roomsRange,
      boundary: 'min',
      config: ROOMS_RANGE_CONFIG,
      nextValue,
      setRange: setRoomsRange,
    })
  }

  const handleRoomsMaxInput = (event) => {
    const nextValue = parseIntOr(event.currentTarget.value, roomsRange.max)
    applyNextRange({
      currentRange: roomsRange,
      boundary: 'max',
      config: ROOMS_RANGE_CONFIG,
      nextValue,
      setRange: setRoomsRange,
    })
  }

  return {
    resetPriceRange,
    resetAreaRange,
    resetRoomsRange,
    handlePriceMinInput,
    handlePriceMaxInput,
    handleAreaMinInput,
    handleAreaMaxInput,
    handleRoomsMinInput,
    handleRoomsMaxInput,
  }
}

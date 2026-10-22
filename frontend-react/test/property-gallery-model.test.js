import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPropertyGalleryImages } from '../src/features/property/model/propertyDetailModel.js'

test('keeps every valid API image and places the main image first', () => {
  const result = buildPropertyGalleryImages({
    main_image: { url: '/media/second.webp' },
    images: [
      { id: 1, url: '/media/first.webp', is_main: false },
      { id: 2, url: '/media/second.webp', is_main: true },
      { id: 3, url: '/media/third.webp', is_main: false },
    ],
  })

  assert.deepEqual(
    result.map((image) => image.url),
    ['/media/second.webp', '/media/first.webp', '/media/third.webp'],
  )
})

test('drops invalid and duplicate image URLs without dropping valid gallery entries', () => {
  const result = buildPropertyGalleryImages({
    images: [
      { id: 1, url: '/media/one.webp', is_main: true },
      { id: 2, url: '', is_main: false },
      { id: 3, url: '/media/one.webp', is_main: false },
      { id: 4, url: '/media/two.webp', is_main: false },
    ],
  })

  assert.deepEqual(
    result.map((image) => image.url),
    ['/media/one.webp', '/media/two.webp'],
  )
})

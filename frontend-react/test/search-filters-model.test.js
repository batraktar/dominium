import assert from 'node:assert/strict'
import test from 'node:test'

import { AREA_RANGE_CONFIG, PRICE_RANGE_CONFIG } from '../src/features/search/constants/searchConfig.js'
import { parseSearchInitialState } from '../src/features/search/model/searchInitialStateModel.js'
import { buildSearchQueryParams } from '../src/features/search/model/searchResultsQueryModel.js'
import {
  commitRangeInput,
  parseRangeInputDraft,
} from '../src/features/search/model/rangeInputModel.js'

test('search supports expensive properties without silently applying a 250k ceiling', () => {
  assert.equal(PRICE_RANGE_CONFIG.max, 2000000)
  assert.equal(parseSearchInitialState('').priceRange.max, 2000000)
  assert.equal(AREA_RANGE_CONFIG.max, 5000)
})

test('search location is preserved in the browser and sent as an exact address filter', () => {
  const initial = parseSearchInitialState('?location=%D0%A5%D1%83%D1%81%D1%82')
  assert.equal(initial.location, 'Хуст')

  const { browserParams, apiParams } = buildSearchQueryParams({
    location: initial.location,
    priceRange: { min: 0, max: PRICE_RANGE_CONFIG.max },
    areaRange: { min: 0, max: 250 },
    roomsRange: { min: 0, max: 5 },
    pathname: '/search/',
  })

  assert.equal(browserParams.get('location'), 'Хуст')
  assert.equal(apiParams.get('location'), 'Хуст')
})

test('range input keeps an empty draft so zero can be replaced by the first typed digit', () => {
  assert.equal(parseRangeInputDraft(''), null)
  assert.equal(parseRangeInputDraft('7'), 7)
  assert.equal(parseRangeInputDraft('75'), 75)
})

test('range input commits blank minimum as zero and clamps custom values only on commit', () => {
  assert.equal(commitRangeInput('', { fallback: 0, min: 0, max: 100 }), 0)
  assert.equal(commitRangeInput('375', { fallback: 0, min: 0, max: 5000 }), 375)
  assert.equal(commitRangeInput('9000', { fallback: 0, min: 0, max: 5000 }), 5000)
})

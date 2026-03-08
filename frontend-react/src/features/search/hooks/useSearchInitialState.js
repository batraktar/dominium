import { useMemo } from 'react'
import { parseSearchInitialState } from '../model/searchInitialStateModel.js'

export default function useSearchInitialState() {
  return useMemo(() => parseSearchInitialState(window.location.search), [])
}

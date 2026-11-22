import { renderHook } from '@testing-library/react'
import React, { act } from 'react'
import { Provider } from 'react-redux'
import { fontSizeActionCreator } from '../../actions/fontSize'
import store from '../../stores/app'
import useRemAsPx from '../useRemAsPx'

/** Redux Provider wrapper so the hook can read state.fontSize. */
const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store, children })

beforeEach(() => {
  store.dispatch({ type: 'clear', full: true })
})

it('converts rem to px at the default font size', () => {
  const { result } = renderHook(() => useRemAsPx(1.125), { wrapper })
  expect(result.current).toBe(18)
})

it('follows the font size when the user changes it', () => {
  const { result } = renderHook(() => useRemAsPx(1.125), { wrapper })

  act(() => {
    store.dispatch(fontSizeActionCreator(32))
  })

  expect(result.current).toBe(36)
})

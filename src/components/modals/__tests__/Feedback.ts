import { render, screen } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import Feedback from '../Feedback'

vi.mock('../../../browser', async importOriginal => {
  const browser = await importOriginal<typeof import('../../../browser')>()
  return { ...browser, isAndroid: true, isCapacitor: () => true, isTouch: true }
})

// https://github.com/cybersemics/em/pull/6073#issuecomment-6594233627
it('uses the resized Android Capacitor viewport above the keyboard', async () => {
  render(createElement(Provider, { store, children: createElement(Feedback) }))

  const fullHeight = window.innerHeight
  try {
    await act(async () => {
      window.innerHeight = 341
      viewportStore.update({ innerHeight: 341, virtualKeyboardHeight: 299 })
      virtualKeyboardStore.update({ open: true, height: 299 })
      window.dispatchEvent(new Event('resize'))
    })
    expect(screen.getByTestId('dialog-overlay').style.height).toBe('341px')
  } finally {
    window.innerHeight = fullHeight
  }
})

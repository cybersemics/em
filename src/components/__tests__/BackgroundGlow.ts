import { render, screen } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import store from '../../stores/app'
import backgroundGlowStore from '../../stores/backgroundGlowStore'
import viewportStore from '../../stores/viewportStore'
import initStore from '../../test-helpers/initStore'
import BackgroundGlow from '../BackgroundGlow'

// Emulate the Android Capacitor app, whose WebView shrinks to the space above the virtual keyboard when it opens.
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      getPlatform: () => 'android',
      isNativePlatform: () => true,
    },
  }
})

beforeEach(initStore)

// https://github.com/cybersemics/em/pull/6079#pullrequestreview-5601462149
it('keeps the glow at its full height when the keyboard opens in the Android app', async () => {
  backgroundGlowStore.update({ image: 'glow-3a.avif' })
  viewportStore.update({ innerWidth: 412, innerHeight: 915 })

  render(createElement(Provider, { store, children: createElement(BackgroundGlow) }))

  // the keyboard opens and the WebView shrinks by its height
  await act(async () => {
    viewportStore.update({ innerHeight: 585 })
  })

  expect(screen.getByTestId('background-glow-layer').style.height).toBe('915px')
})

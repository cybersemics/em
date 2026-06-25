import { Keyboard } from '@capacitor/keyboard'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { showModalActionCreator as showModal } from '../../actions/showModal'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

// Emulate the native iOS Capacitor app so that the iOS-specific keyboard-dismissal path in
// onExportClick is exercised. isTouch is left at its default (false) so that mobile-only
// components (e.g. the signature-pad TraceGesture) are not mounted in jsdom.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isIOS: true }
})

// Spy on the Capacitor Keyboard plugin so we can assert the keyboard is dismissed before sharing.
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    hide: vi.fn(() => Promise.resolve()),
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
    removeAllListeners: vi.fn(() => Promise.resolve()),
  },
}))

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share')

beforeEach(createTestApp)
afterEach(() => {
  cleanupTestApp()
  if (originalShare) {
    Object.defineProperty(navigator, 'share', originalShare)
  } else {
    delete (navigator as { share?: unknown }).share
  }
})

// Regression test for https://github.com/cybersemics/em/issues/4294
// On the iOS Capacitor app, tapping Share opened the native share sheet while the software
// keyboard was still visible, causing the two to overlap. The keyboard must be dismissed before
// navigator.share is invoked.
it('dismisses the keyboard before opening the native share sheet on iOS', async () => {
  // record the order in which the keyboard is hidden and the share sheet is invoked
  const calls: string[] = []
  vi.mocked(Keyboard.hide).mockImplementation(() => {
    calls.push('keyboard.hide')
    return Promise.resolve()
  })
  const share = vi.fn(() => {
    calls.push('share')
    return Promise.resolve()
  })
  Object.defineProperty(navigator, 'share', { configurable: true, value: share })

  await dispatch([importText({ text: '- a' }), setCursor(['a']), showModal({ id: 'export' })])

  await act(vi.runOnlyPendingTimersAsync)

  await click('[data-testid="export-share-button"]')

  expect(Keyboard.hide).toHaveBeenCalled()
  expect(share).toHaveBeenCalled()
  // the keyboard must be dismissed before the share sheet opens, otherwise they overlap (#4294)
  expect(calls).toEqual(['keyboard.hide', 'share'])
})

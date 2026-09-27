import { resetStores } from '../../stores/ministore'
import preventAutoscroll, { isPreventAutoscrollInProgress } from '../preventAutoscroll'

// preventAutoscroll does nothing on desktop, which is what jsdom reports.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isTouch: true }
})

// https://github.com/cybersemics/em/issues/5251
it('restores the held element and cancels its timer when the stores are reset', () => {
  const el = document.createElement('div')
  el.style.paddingBottom = '3px'
  document.body.appendChild(el)

  preventAutoscroll(el)
  expect(el.hasAttribute('data-prevent-autoscroll')).toBe(true)

  resetStores()

  expect(el.hasAttribute('data-prevent-autoscroll')).toBe(false)
  expect(el.style.paddingBottom).toBe('3px')
  expect(isPreventAutoscrollInProgress()).toBe(false)
  el.remove()
})

import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import viewportStore from '../../stores/viewport'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import queryThoughtByText from '../../test-helpers/queries/queryThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

const onRender = vi.fn()

beforeEach(async () => {
  onRender.mockClear()
  await createTestApp({ onRender })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await cleanupTestApp()
})

it('does not commit when no thought crosses the viewport boundary while preserving boundary virtualization', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 20))
  await act(async () => viewportStore.update({ innerHeight: 100 }))

  await dispatch(
    importText({
      text: Array.from({ length: 60 }, (_, index) => `- thought ${index + 1}`).join('\n'),
    }),
  )
  await dispatch(setCursor(null))
  await act(vi.runOnlyPendingTimersAsync)

  expect(await queryThoughtByText('thought 60')).toBeNull()

  onRender.mockClear()
  await act(async () => {
    document.documentElement.scrollTop = 1
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(onRender).not.toHaveBeenCalled()
  expect(await queryThoughtByText('thought 60')).toBeNull()

  await act(async () => {
    document.documentElement.scrollTop = 1000
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('thought 60')).not.toBeNull()

  await act(async () => {
    document.documentElement.scrollTop = 0
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('thought 60')).toBeNull()
})

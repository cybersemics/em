import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import col1MaxWidthStore from '../../stores/col1MaxWidthStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import { editThoughtByContextActionCreator as editThought } from '../../test-helpers/editThoughtByContext'
import queryThoughtByText from '../../test-helpers/queries/queryThoughtByText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../test-helpers/setCursorFirstMatch'

const profilerOnRender = vi.fn()

beforeEach(async () => {
  profilerOnRender.mockClear()
  await createTestApp({ profilerOnRender })
})

afterEach(async () => {
  document.documentElement.scrollTop = 0
  vi.restoreAllMocks()
  await cleanupTestApp()
})

it('does not commit when only the prepared table-alignment width changes', async () => {
  await dispatch(importText({ text: '- a\n- b' }))
  await act(vi.runAllTimersAsync)
  expect(await queryThoughtByText('a')).not.toBeNull()
  expect(await queryThoughtByText('b')).not.toBeNull()
  profilerOnRender.mockClear()

  await act(async () => {
    col1MaxWidthStore.update(width => (width ?? 0) + 100)
    await vi.runAllTimersAsync()
  })

  expect(profilerOnRender).not.toHaveBeenCalled()
  expect(await queryThoughtByText('a')).not.toBeNull()
  expect(await queryThoughtByText('b')).not.toBeNull()
})

it('does not commit when no thought crosses the viewport boundary while preserving boundary virtualization', async () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 36))
  const innerHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(72)
  const resizeHost = window.visualViewport ?? window
  await act(async () => {
    resizeHost.dispatchEvent(new Event('resize'))
    await vi.runOnlyPendingTimersAsync()
  })

  await dispatch(
    importText({
      // Import leaves the cursor on the last imported thought by default. Nothing below the cursor is
      // virtualized, so that would mount all 60 thoughts only for the setCursor(null) on the next line to
      // unmount 51 of them again — the single most expensive thing this test did.
      preventSetCursor: true,
      text: Array.from({ length: 60 }, (_, index) => `- thought ${index + 1}`).join('\n'),
    }),
  )
  await dispatch(setCursor(null))
  await act(vi.runOnlyPendingTimersAsync)

  // The ninth thought is exactly on the strict virtualization boundary:
  // 72px viewport + five 36px overscan rows + one 36px row height = 288px.
  expect(await queryThoughtByText('thought 9')).not.toBeNull()
  expect(await queryThoughtByText('thought 10')).toBeNull()
  expect(await queryThoughtByText('thought 60')).toBeNull()

  profilerOnRender.mockClear()

  // Safari reports negative scrollTop values during elastic overscroll. The virtualization boundary must stay
  // clamped to zero so that rubber-banding at the top does not mount or unmount thoughts.
  await act(async () => {
    document.documentElement.scrollTop = -1
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(profilerOnRender).not.toHaveBeenCalled()
  expect(await queryThoughtByText('thought 9')).not.toBeNull()
  expect(await queryThoughtByText('thought 10')).toBeNull()

  profilerOnRender.mockClear()
  await act(async () => {
    document.documentElement.scrollTop = 1
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(profilerOnRender).not.toHaveBeenCalled()
  expect(await queryThoughtByText('thought 9')).not.toBeNull()
  expect(await queryThoughtByText('thought 10')).toBeNull()
  expect(await queryThoughtByText('thought 60')).toBeNull()

  innerHeight.mockReturnValue(108)
  await act(async () => {
    resizeHost.dispatchEvent(new Event('resize'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('thought 10')).not.toBeNull()
  expect(await queryThoughtByText('thought 11')).toBeNull()

  innerHeight.mockReturnValue(72)
  await act(async () => {
    resizeHost.dispatchEvent(new Event('resize'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('thought 10')).toBeNull()

  // Thought 60 crosses its 288px-ahead cutoff around 1836px; 1900px is reachable for this 2160px list.
  await act(async () => {
    document.documentElement.scrollTop = 1900
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

  // Reenter after an unmounted row changes; content must read the current thought, not its previous render.
  await dispatch(editThought(['thought 60'], 'updated thought'))
  await act(async () => {
    document.documentElement.scrollTop = 1900
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('updated thought')).not.toBeNull()

  // The cursor remains mounted even when it is below the render window.
  await dispatch(setCursor(['updated thought']))
  await act(async () => {
    document.documentElement.scrollTop = 0
    window.dispatchEvent(new Event('scroll'))
    await vi.runOnlyPendingTimersAsync()
  })

  expect(await queryThoughtByText('updated thought')).not.toBeNull()
  await dispatch(setCursor(null))
  await act(vi.runOnlyPendingTimersAsync)
  expect(await queryThoughtByText('updated thought')).toBeNull()
})

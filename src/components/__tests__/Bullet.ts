import { ReactWrapper } from 'enzyme'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import testTimer from '../../test-helpers/testTimer'
import windowEvent from '../../test-helpers/windowEvent'

let wrapper: ReactWrapper<unknown, unknown> // eslint-disable-line fp/no-let

beforeEach(async () => {
  wrapper = await createTestApp()
})

afterEach(cleanupTestApp)

const fakeTimer = testTimer()

it('bullet should not fade on edit, should only fade i.e color to gray when thought is missing', async () => {
  // create thought

  fakeTimer.useFakeTimer()

  windowEvent('keydown', { key: 'Enter' })
  wrapper.update()
  const editable = wrapper.find('div.editable')
  await editable.simulate('change', { target: { value: 'a' } })

  await fakeTimer.runAllAsync()
  await fakeTimer.useRealTimer()
  wrapper.update()
  const bulletEllipsis = document.querySelector('.bullet .glyph .glyph-fg.gray')
  expect(bulletEllipsis).toBeNull()
})

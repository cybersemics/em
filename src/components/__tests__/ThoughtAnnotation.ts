import { screen } from '@testing-library/dom'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('renders the email annotation on a plain email address', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - foo@bar.com
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByLabelText('email-link')).toHaveAttribute('href', 'mailto:foo@bar.com')
})

it('renders the email annotation when a foreColor is applied', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - <font color="#ff573d">foo@bar.com</font>
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByLabelText('email-link')).toHaveAttribute('href', 'mailto:foo@bar.com')
})

it('renders the email annotation when a backColor is applied', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - <span style="background-color: rgb(223, 122, 1);">foo@bar.com</span>
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.getByLabelText('email-link')).toHaveAttribute('href', 'mailto:foo@bar.com')
})

it('does not render the email annotation on a non-email thought', async () => {
  await dispatch([
    importText({
      text: `
        - a
          - <font color="#ff573d">b</font>
      `,
    }),
  ])

  await act(vi.runOnlyPendingTimersAsync)

  expect(screen.queryByLabelText('email-link')).toBeNull()
})

import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createRtlTestApp'
import { findThoughtByText } from '../../test-helpers/queries'
import windowEvent from '../../test-helpers/windowEvent'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('Divider', () => {
  it('convert "---" to divider', async () => {
    await act(async () => {
      windowEvent('keydown', { key: 'Enter' })
    })

    const editable = await findThoughtByText('')

    // '-' is not a divider
    await act(async () => {
      userEvent.type(editable!, '-')
    })
    const divider1 = screen.queryByLabelText('divider')
    expect(divider1).toBeNull()

    // '--' is not a divider
    await act(async () => {
      userEvent.type(editable!, '-')
    })
    const divider2 = screen.queryByLabelText('divider')
    expect(divider2).toBeNull()

    // '--' is a divider
    await act(async () => {
      userEvent.type(editable!, '-')
    })
    const divider3 = screen.queryByLabelText('divider')
    expect(divider3).toBeTruthy()
  })
})

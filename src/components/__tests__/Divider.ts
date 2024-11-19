import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import windowEvent from '../../test-helpers/windowEvent'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('Divider', () => {
  it('convert "---" to divider', async () => {
    
    await act(async () => {
      windowEvent('keydown', { key: 'Enter' })
    })

    const user = userEvent.setup({ delay: null })

    const editable = await findThoughtByText('')

    // '-' is not a divider
    await user.type(editable!, '-')
    const divider1 = screen.queryByLabelText('divider')
    expect(divider1).toBeNull()

    // // '--' is not a divider
    await user.type(editable!, '-')
    const divider2 = screen.queryByLabelText('divider')
    expect(divider2).toBeNull()

    // // '--' is a divider
    await user.type(editable!, '-')
    const divider3 = screen.queryByLabelText('divider')
    expect(divider3).toBeTruthy()

    await act(() => vitest.runAllTimersAsync())
  })
})

import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import backgroundGlowStore from '../../stores/backgroundGlowStore'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

describe('background glow picker', () => {
  it('show the current opacity next to the slider when the picker is opened', async () => {
    // an opacity chosen earlier, as restored from local storage on a later visit
    await act(async () => {
      backgroundGlowStore.update({ opacity: 0.25 })
    })

    await click('[data-testid=background-glow]')

    expect(screen.getByRole('status').textContent).toBe('0.25')
  })

  it('update the opacity label as the slider is moved', async () => {
    await click('[data-testid=background-glow]')

    // user-event has no slider interaction, so set the value and fire the change event that dragging produces
    await act(async () => {
      fireEvent.change(screen.getByRole('slider', { name: 'Opacity' }), { target: { value: '0.35' } })
    })

    expect(screen.getByRole('status').textContent).toBe('0.35')
  })
})

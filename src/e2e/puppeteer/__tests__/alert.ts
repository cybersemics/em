import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import paste from '../helpers/paste'
import waitForAlert from '../helpers/waitForAlert'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('alert', () => {
  // https://github.com/cybersemics/em/issues/6233
  it.skip('centers the Cancel label in the multiselect alert', async () => {
    await paste(`
      - a
      - b
    `)

    await clickThought('a')
    await command('selectAll')
    await waitForAlert('thoughts selected')

    const { alertCenter, cancelCenter } = await page.evaluate(() => {
      const alert = document.querySelector('[data-testid="alert-content"]')!.parentElement!
      const cancel = Array.from(alert.querySelectorAll('a')).find(a => a.textContent === 'Cancel')!
      // measure the label itself rather than the button, since the button fills the alert and only its text is off center
      const label = document.createRange()
      label.selectNodeContents(cancel)
      const alertRect = alert.getBoundingClientRect()
      const labelRect = label.getBoundingClientRect()
      return {
        alertCenter: alertRect.left + alertRect.width / 2,
        cancelCenter: labelRect.left + labelRect.width / 2,
      }
    })

    expect(cancelCenter).toBeCloseTo(alertCenter, 0)
  })
})

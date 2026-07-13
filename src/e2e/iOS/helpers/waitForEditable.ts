import getEditable from './getEditable'

/** Wait for editable element that contains given value. */
const waitForEditable = async (value: string) => {
  await browser.waitUntil(
    async () =>
      browser.execute(value => {
        return (
          Array.from(document.querySelectorAll('[data-editable]')).filter(element => element.innerHTML === value)
            .length > 0
        )
      }, value),
    { timeout: 15000 },
  )
  return getEditable(value)
}

export default waitForEditable

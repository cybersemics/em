import { page } from '../session'

/**
 * Waits for the address bar to name the thought with the given value as the cursor. The url is written by a throttled middleware, so it lags the cursor, and the write for one cursor move can be folded into the next. Matches the first editable with the given innerHTML, and does not account for the context view marker that is appended to a thought id in the url.
 */
const waitForUrlCursor = (value: string) =>
  page.waitForFunction(
    (value: string) => {
      const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
        element => element.innerHTML === value,
      )
      const id = editable?.getAttribute('aria-label')?.replace(/^editable-/, '')
      return !!id && window.location.pathname.split('/').at(-1) === id
    },
    // A throttled write lands within about 100 ms. Bounding the wait well below the test timeout makes a url that never
    // names the thought fail here, at the wait, rather than as a test timeout.
    { timeout: 5000 },
    value,
  )

export default waitForUrlCursor

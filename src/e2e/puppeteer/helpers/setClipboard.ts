import { page } from '../session'

/** Loads plain text and optional HTML into the browser clipboard for a subsequent user paste action. */
const setClipboard = async ({ html, text }: { html?: string; text: string }) => {
  await page.evaluate(
    async ({ html, text }) => {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          ...(html ? { 'text/html': new Blob([html], { type: 'text/html' }) } : null),
        }),
      ])
    },
    { html, text },
  )
}

export default setClipboard

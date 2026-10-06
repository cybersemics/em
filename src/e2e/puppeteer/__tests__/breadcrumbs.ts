import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import waitForCursor from '../helpers/waitForCursor'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

// https://github.com/cybersemics/em/issues/5855
it.skip('empty cursor thought shows the outline placeholder in italic grey in the breadcrumbs', async () => {
  await paste(`
- a
  - b
  -
`)
  await clickThought('')
  await waitForCursor('')

  const breadcrumb = await page.$$eval(
    '[aria-label="nav"] [aria-label="context-breadcrumbs"] [data-thought-link]',
    links => {
      const link = links[links.length - 1]
      const text = document.createTreeWalker(link, NodeFilter.SHOW_TEXT).nextNode()
      const style = text?.parentElement ? getComputedStyle(text.parentElement) : null
      return { text: link.textContent, fontStyle: style?.fontStyle, color: style?.color }
    },
  )
  const outlinePlaceholderColor = await page.$eval(
    '[data-editing=true] [data-editable]',
    editable => getComputedStyle(editable, '::before').color,
  )
  expect(breadcrumb).toEqual({ text: 'Add a thought', fontStyle: 'italic', color: outlinePlaceholderColor })
})

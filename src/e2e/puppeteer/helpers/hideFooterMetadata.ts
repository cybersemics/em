import { page } from '../session'

/** Hides diagnostic footer text for visual tests without changing the footer's size or controls. */
const hideFooterMetadata = async () => {
  await page.$$eval('[aria-label="footer"] li', items => {
    const labels = ['Status:', 'TSID:', 'App Version:', 'Commit:']
    labels.forEach(label => {
      const item = items.find(item => item.textContent?.trim().startsWith(label))
      if (!item) throw new Error(`Missing footer metadata: ${label}`)
      item.style.visibility = 'hidden'
    })
  })
}

export default hideFooterMetadata

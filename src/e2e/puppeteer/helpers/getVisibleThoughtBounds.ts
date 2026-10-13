import { page } from '../session'

/** Returns the visible-thought scroll clamp bounds derived from current DOM geometry. */
const getVisibleThoughtBounds = async (): Promise<{
  maxScrollY: number
  minScrollY: number
  viewportAllowance: number
  viewportBottomBoundary: number
  viewportTopBoundary: number
}> =>
  page.evaluate(() => {
    const visibleRects = Array.from(document.querySelectorAll<HTMLElement>('[data-editable]'))
      .filter(element => {
        let currentElement: HTMLElement | null = element
        while (currentElement) {
          const style = window.getComputedStyle(currentElement)
          if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) <= 0.01) {
            return false
          }
          currentElement = currentElement.parentElement
        }
        return true
      })
      .map(element => element.getBoundingClientRect())

    if (!visibleRects.length) {
      throw new Error('No visible thoughts found.')
    }

    const visibleTopDocument = Math.min(...visibleRects.map(rect => rect.top + window.scrollY))
    const visibleBottomDocument = Math.max(...visibleRects.map(rect => rect.bottom + window.scrollY))
    const viewportTopBoundary = document.getElementById('toolbar')?.getBoundingClientRect().bottom || 0
    const navHeight = document.querySelector('[aria-label="nav"]')?.getBoundingClientRect().height || 0
    const footerRect = document.querySelector('[aria-label="footer"]')?.getBoundingClientRect()
    const viewportBottomBoundary = window.innerHeight - navHeight
    const viewportUsableHeight = Math.max(1, viewportBottomBoundary - viewportTopBoundary)
    const viewportAllowance = viewportUsableHeight * 0.8
    const nativeMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const minScrollY = Math.min(nativeMax, Math.max(0, visibleTopDocument - (viewportTopBoundary + viewportAllowance)))
    const visibleContentBottom = Math.max(visibleBottomDocument, footerRect ? footerRect.bottom + window.scrollY : 0)
    const maxScrollY = Math.min(
      nativeMax,
      Math.max(minScrollY, visibleContentBottom - (viewportBottomBoundary - viewportAllowance)),
    )

    return { minScrollY, maxScrollY, viewportTopBoundary, viewportBottomBoundary, viewportAllowance }
  })

export default getVisibleThoughtBounds

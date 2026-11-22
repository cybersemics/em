import { once } from 'lodash'
import { RefObject, useLayoutEffect } from 'react'

/** Returns the canvas context every fit measures with. One context serves them all, since measuring only sets its font. It is created on first use rather than when the module loads, so that importing a component that fits text does not create a canvas. */
const getMeasuringContext = once(() => document.createElement('canvas').getContext('2d'))

/**
 * Returns the width a sibling takes from the row. A sibling that grows to fill whatever space is left only claims the width it was given: the rest is space the text can have. Icons are the usual case, since iconRecipe gives every icon `flex: 1` while AnimatedIcon sets its size as an inline width. A growing sibling without an inline width claims the width of its content.
 */
const claimedWidth = (sibling: Element) => {
  if (parseFloat(window.getComputedStyle(sibling).flexGrow) === 0) return sibling.getBoundingClientRect().width
  const specifiedWidth = sibling instanceof HTMLElement ? parseFloat(sibling.style.width) : NaN
  if (!isNaN(specifiedWidth)) return specifiedWidth
  const range = document.createRange()
  range.selectNodeContents(sibling)
  return range.getBoundingClientRect().width
}

/**
 * Sizes a single line of text to the largest font size, up to maxFontSize, at which it fits the room its parent row leaves for it. Text that fits at maxFontSize is left at maxFontSize, so it still follows the user's font size wherever there is room for it. This is the shrink-to-fit that PowerPoint applies to a text box. The hook owns the element's font size, so the element must not set one of its own.
 *
 * The room is the width of the parent's content box less the widths of the element's siblings in the flow and the gaps between them. A sibling that grows to fill leftover space only counts for the width of its content. That keeps it independent of the text, so the element can keep its natural width (and be centered with its siblings) rather than being stretched to fill the row. The siblings' widths must therefore not depend on the element's.
 *
 * The text is measured once with a canvas rather than by laying it out at trial sizes, which would force a layout for every size tried. It is measured again when the parent is resized, when the text or maxFontSize changes, and when the page's web fonts finish loading. A fit takes about 18µs in Chrome on a laptop (see docs/liminal-ui/a11y.md).
 */
const useFitText = (
  ref: RefObject<HTMLElement | null>,
  {
    text,
    maxFontSize,
  }: {
    /** The text to fit. Pass an empty string to leave the element at maxFontSize, such as an input once it has a value. */
    text: string
    /** The largest font size in px, which is what the text is shown at whenever it fits. */
    maxFontSize: number
  },
) => {
  useLayoutEffect(() => {
    const element = ref.current
    const parent = element?.parentElement
    const context = getMeasuringContext()
    if (!element || !parent || !context) return

    /** Measures the text at maxFontSize against the room the parent leaves for it, and sets the font size that fits. */
    const fit = () => {
      const style = window.getComputedStyle(element)
      const parentStyle = window.getComputedStyle(parent)
      // Siblings taken out of the flow, such as an icon laid over an input, do not take room from the text.
      const siblings = [...parent.children].filter(
        child => child !== element && !['absolute', 'fixed'].includes(window.getComputedStyle(child).position),
      )
      const gap = parseFloat(parentStyle.columnGap) || 0
      const room =
        parent.clientWidth -
        parseFloat(parentStyle.paddingLeft) -
        parseFloat(parentStyle.paddingRight) -
        siblings.reduce((total, sibling) => total + claimedWidth(sibling), 0) -
        gap * siblings.length -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight)

      context.font = `${style.fontStyle} ${style.fontWeight} ${maxFontSize}px ${style.fontFamily}`
      // A percentage letter spacing is relative to the font size, and stays a percentage in the computed style, which the canvas does not accept.
      context.letterSpacing =
        style.letterSpacing === 'normal'
          ? '0px'
          : style.letterSpacing.endsWith('%')
            ? `${(parseFloat(style.letterSpacing) / 100) * maxFontSize}px`
            : style.letterSpacing
      const naturalWidth = context.measureText(text).width
      // Text width is proportional to font size, so one measurement gives the size that fits.
      const fontSize = naturalWidth > room ? (maxFontSize * room) / naturalWidth : maxFontSize
      element.style.fontSize = `${fontSize}px`
    }

    fit()
    // Changing the font size changes the parent's height but not its width, so the observer settles after one extra call.
    const observer = new ResizeObserver(fit)
    observer.observe(parent)
    // A web font that finishes loading after the fit leaves the text measured with the fallback font's metrics, and loading it does not resize the parent, so fit again once it has loaded. The dialog's text is set in Radio Canada, which loads after the page.
    document.fonts.addEventListener('loadingdone', fit)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', fit)
    }
  }, [ref, text, maxFontSize])
}

export default useFitText

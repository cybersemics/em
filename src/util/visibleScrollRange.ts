/** Calculates the logical window scroll range that keeps part of the visible thought cluster onscreen. */
const visibleScrollRange = ({
  visibleTop,
  visibleBottom,
  viewportHeight,
  topInset,
  slackY,
  documentHeight,
}: {
  /** Document y of the first visible thought. */
  visibleTop: number
  /** Document y of the bottom edge of the last visible thought. */
  visibleBottom: number
  /** Viewport height in pixels. */
  viewportHeight: number
  /** Height of fixed content that obstructs the top of the viewport. */
  topInset: number
  /** Minimum part of the visible cluster that must remain inside each viewport edge. */
  slackY: number
  /** Full document height, including hidden thought space. */
  documentHeight: number
}): {
  /** Smallest permitted window scroll position. */
  minScroll: number
  /** Largest permitted window scroll position. */
  maxScroll: number
} => {
  const documentMaxScroll = Math.max(0, Math.floor(documentHeight - viewportHeight))

  if (
    !Number.isFinite(visibleTop) ||
    !Number.isFinite(visibleBottom) ||
    visibleBottom < visibleTop ||
    viewportHeight <= 0
  ) {
    return { minScroll: 0, maxScroll: documentMaxScroll }
  }

  const minScroll = Math.min(documentMaxScroll, Math.max(0, Math.ceil(visibleTop - viewportHeight + slackY)))
  const maxScroll = Math.min(
    documentMaxScroll,
    Math.max(minScroll, Math.floor(visibleBottom - Math.max(0, topInset) - slackY)),
  )

  return { minScroll, maxScroll }
}

export default visibleScrollRange

import PreloadedImageUrl from '../@types/PreloadedImageUrl'

/** Paths whose image has already started loading, so that a call on every render only loads the image once. */
const started = new Set<string>()

/** Starts fetching and decoding an image, and returns it as a CSS url() for backgroundImage. */
const preloadImage = (src: string): PreloadedImageUrl => {
  if (!started.has(src)) {
    started.add(src)
    const image = new Image()
    image.src = src
    // A failed decode only means the image loads when it is shown, so there is nothing to handle.
    image.decode().catch(() => {})
  }
  return `url(${src})` as PreloadedImageUrl
}

export default preloadImage

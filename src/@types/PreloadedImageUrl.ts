import Brand from './Brand'

/** A CSS url() for an image that has been preloaded. The only way to make one is preloadImage, and backgroundImage in css() accepts no other url(), so an image shown that way cannot skip preloading. */
type PreloadedImageUrl = string & Brand<'PreloadedImageUrl'>

export default PreloadedImageUrl

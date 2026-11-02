import backgroundImages from '../../styled-system/background-images.json'
import syncStatusStore from '../stores/syncStatusStore'
import taskQueue from './taskQueue'

/** How many images should we preload at once? */
const CONCURRENCY = 4

/** Fetches and decodes an image at `low` priority. If the image fails, swallow it silently. The image will try to load again when it is shown. */
const preload = async (src: string) => {
  const image = new Image()
  image.fetchPriority = 'low'
  image.src = src
  await image.decode().catch(() => {})
}

/**
 * Preloads every background image in the app's CSS once the first sync pull has finished.
 * This prevents background images from visibly "popping in" when a component first shows them.
 * Because we wait until the first sync pull has finished, images load strictly behind visible thoughts.
 * The list of images is generated from the CSS by `backgroundImageManifestPlugin`.
 */
const preloadBackgroundImages = async () => {
  await syncStatusStore.once(({ isPulling }) => isPulling)
  await syncStatusStore.once(({ isPulling }) => !isPulling)
  await taskQueue<void>({ concurrency: CONCURRENCY }).add(backgroundImages.map(src => () => preload(src)))
}

export default preloadBackgroundImages

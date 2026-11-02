import { css } from '../../styled-system/css'

/** Sets each debug background glow image, keyed by its file name in public/img/glow, which is what backgroundGlowStore persists. The images are in the CSS so that they are preloaded with the app's other background images. */
const backgroundGlowImageClassName: Record<string, string> = {
  'glow-3a.avif': css({ backgroundImage: 'url(/img/glow/glow-3a.avif)' }),
  'glow-3b.avif': css({ backgroundImage: 'url(/img/glow/glow-3b.avif)' }),
  'glow-3c.avif': css({ backgroundImage: 'url(/img/glow/glow-3c.avif)' }),
  'glow-11.avif': css({ backgroundImage: 'url(/img/glow/glow-11.avif)' }),
}

export default backgroundGlowImageClassName

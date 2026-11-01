import { definePlugin } from '@pandacss/dev'
import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import valueParser from 'postcss-value-parser'

/**
 * This PandaCSS plugin reads the compiled CSS after generation (`cssgen:done`), and extracts an array of *all* of the background images
 * used in the app.
 *
 * It then writes this list to a JSON file in the `styled-system` directory, where `preloadBackgroundImages` can import it
 * to preload the background images at runtime.
 *
 * The JSON file is written to `styled-system/background-images.json`, and is bundled within the app by Vite.
 * Because it is bundled, it has to exist before Vite bundles the app, which is why `scripts/build-styles.mjs` runs
 * `panda cssgen` before `vite build`.
 */

const backgroundImageManifestPlugin = definePlugin({
  name: 'background-image-manifest',
  hooks: {
    'cssgen:done': ({ artifact, content, cwd }) => {
      /** This array contains the image paths in a CSS string's background and background-image declarations.
       * The CSS is parsed rather than matched with a regular expression, so a url() in a comment or a string is ignored, and a
       * quoted path may contain a parenthesis or semicolon. A data: URI is skipped, since there is nothing to fetch.
       * There's an ESLint rule which makes sure that background image URLs start with `/` (root-relative) or `http://` / `https://`.
       * This ensures that the preloading logic can correctly resolve the URLs against the root of the site or an absolute URL.
       * It's sorted so that the list only changes when the images do. */
      const backgroundImages = (css: string) => {
        const urls = new Set<string>()
        postcss.parse(css).walkDecls(/^background(-image)?$/, decl => {
          valueParser(decl.value).walk(node => {
            if (node.type !== 'function' || node.value.toLowerCase() !== 'url') return
            // A quoted path is a single string node. An unquoted one is a single word, except in an uppercase URL(),
            // which the value parser splits into words at each slash.
            const url = (
              node.nodes.length === 1 && node.nodes[0].type === 'string'
                ? node.nodes[0].value
                : valueParser.stringify(node.nodes)
            ).trim()
            if (url && !url.startsWith('data:')) urls.add(url)
          })
        })
        return [...urls].sort()
      }

      if (artifact !== 'styles.css') return
      const file = path.join(cwd ?? process.cwd(), 'styled-system', 'background-images.json')
      const json = JSON.stringify(backgroundImages(content), null, 2) + '\n'
      // Skip an unchanged list, so that the dev server does not reload the module that imports it on every CSS change.
      if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === json) return
      fs.writeFileSync(file, json)
    },
  },
})

export default backgroundImageManifestPlugin

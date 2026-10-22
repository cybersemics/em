import { definePlugin } from '@pandacss/dev'
import inlinePreloadImageCalls from './inlinePreloadImageCalls.js'

/**
 * Makes PandaCSS work with preloadImage(), and makes preloading the only way to set an image in css().
 *
 * Images are preloaded so that they are already downloaded and decoded by the time they need to be shown.
 * The preloadImage() function starts loading an image and returns its url() typed as a PreloadedImageUrl.
 *
 * This plugin:
 *
 * 1. Lets PandaCSS read preloadImage() calls.
 * PandaCSS generates CSS by reading css() calls without running them, so it cannot know what a call returns.
 * Before it reads a file, each preloadImage('/img/...') call is rewritten to the url() it returns. This changes only
 * what PandaCSS reads, and doesn't affect runtime.
 *
 * 2. Narrows the acceptable values for backgroundImage in css() to a PreloadedImageUrl, gradients, CSS variables, and
 * CSS-wide keywords.
 * This ensures that images that are NOT preloaded do not compile, adding strict type enforcement.
 * PandaCSS doesn't have a built-in setting to narrow one property's type, so this uses the codegen:prepare hook, which
 * lets plugins change generated files, to replace the line PandaCSS writes for backgroundImage in
 * styled-system/types/system.d.ts. The background shorthand and inline styles, which the generated types cannot
 * reach, are covered by no-restricted-syntax in eslint.config.js.
 *
 * 3. Preloads the images that recipes use. Recipes run when PandaCSS builds, never in the browser, so they cannot call
 * preloadImage(). Instead, a preloadImage() call for each image a recipe uses is appended to its generated module,
 * which runs when a component imports it.
 */

/**
 * The exact line PandaCSS writes for backgroundImage in styled-system/types/system.d.ts. If a PandaCSS upgrade changes
 * it, the build fails rather than silently accepting any image.
 */
const BACKGROUND_IMAGE_TYPE = 'backgroundImage?: ConditionalValue<AssetsValue | CssAny>'

/** The type that replaces it. */
const NARROWED_BACKGROUND_IMAGE_TYPE =
  "backgroundImage?: ConditionalValue<PreloadedImageUrl | CssGlobals | 'none' | `var(--${string})` | `${'linear' | 'radial' | 'conic' | 'repeating-linear' | 'repeating-radial' | 'repeating-conic'}-gradient(${string}`>"

/** Image paths in a recipe's styles, read from the url()s in it. */
const recipeImages = (recipe: unknown) => [
  ...new Set([...JSON.stringify(recipe).matchAll(/url\((\/img\/[^)'"]+)\)/g)].map(match => match[1])),
]

/** The images each recipe uses, keyed by the recipe's className. Filled in when PandaCSS resolves the config. */
let imagesByClassName = new Map<string, string[]>()

const preloadImagePlugin = definePlugin({
  name: 'preload-image',
  hooks: {
    'config:resolved': ({ config }) => {
      const recipes = { ...config.theme?.recipes, ...config.theme?.slotRecipes }
      imagesByClassName = new Map(
        Object.values(recipes).map(recipe => [recipe.className ?? '', recipeImages(recipe)] as const),
      )
    },

    // Returning undefined leaves a file without a preloadImage() call unchanged.
    'parser:before': ({ content }) => inlinePreloadImageCalls(content),

    'codegen:prepare': ({ artifacts }) =>
      artifacts.map(artifact => ({
        ...artifact,
        files: artifact.files.map(file => {
          if (file.path.endsWith('types/system.d.ts')) {
            if (!file.code.includes(BACKGROUND_IMAGE_TYPE)) {
              throw new Error(`preload-image: "${BACKGROUND_IMAGE_TYPE}" not found in ${file.path}`)
            }
            return {
              ...file,
              code:
                "import type PreloadedImageUrl from '../../src/@types/PreloadedImageUrl'\n" +
                file.code.replace(BACKGROUND_IMAGE_TYPE, NARROWED_BACKGROUND_IMAGE_TYPE),
            }
          }

          if (/^recipes\/.+\.js$/.test(file.path)) {
            // The hook is not told which recipe a file was generated from, but PandaCSS writes the recipe's className
            // into it, so find the recipe by that. If PandaCSS stops writing it, no recipe matches and its images
            // silently stop being preloaded.
            const images = [...imagesByClassName].find(([className]) =>
              file.code.includes(`"className":"${className}"`),
            )?.[1]
            if (images?.length) {
              return {
                ...file,
                code: [
                  file.code,
                  "import preloadImage from '../../src/util/preloadImage'",
                  ...images.map(image => `preloadImage(${JSON.stringify(image)})`),
                  '',
                ].join('\n'),
              }
            }
          }

          return file
        }),
      })),
  },
})

export default preloadImagePlugin

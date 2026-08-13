/** Yarn constraints. Run `yarn constraints` to check, `yarn constraints --fix` to apply. */

/**
 * Keeps sharp on the exact version @capacitor/assets depends on, so icon generation and asset generation share a single
 * native binary instead of installing two.
 */
const sharpVersion = require('@capacitor/assets/package.json').dependencies.sharp

module.exports = {
  constraints: ({ Yarn }) => {
    for (const dependency of Yarn.dependencies({ ident: 'sharp' })) {
      dependency.update(sharpVersion)
    }
  },
}

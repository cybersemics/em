/* Visual regression tests
 * Snapshot Directory: ./__image_snapshots__/{filename}
 * Run `jest -u` to update failed snapshots.
 * Press i in jest watch to update failing snapshots interactively.
 * See: https://github.com/americanexpress/jest-image-snapshot
 */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import path from 'path'

/** Configures snapshot test settings. */
function configureSnapshots({
  fileName,
  comparisonMethod = 'pixelmatch',
}: {
  /** The file name of the test file (excluding extension). This is used to group snapshots into an identically-named subdirectory. */
  fileName: string
  comparisonMethod?: 'pixelmatch' | 'ssim'
}) {
  return configureToMatchImageSnapshot({
    customDiffConfig: {
      // per-pixel failure threshold percent (default: 0.01)
      // puppeteer anti-aliasing (?) commonly creates small differences in text and svg rendering at different font sizes, so increase the threshold
      // Bullet SVGs fail even at 0.1
      // for precise accuracy in ssim comparision method we use fast mode (https://github.com/americanexpress/jest-image-snapshot?tab=readme-ov-file#ssim-performance-considerations)
      ...(comparisonMethod === 'ssim' ? { ssim: 'fast' } : { threshold: 0.18 }),
    },
    // full picture failure threshold pixels (default: 0)
    // when comparing with ssim, the failure threshold is 0.1% which is significantly tighter than common recommendations like 1% (0.01)
    ...(comparisonMethod === 'ssim'
      ? { failureThresholdType: 'percent', failureThreshold: 0.001 }
      : { failureThreshold: 4 }),

    // custom identifier for snapshots based on the title of the test
    customSnapshotIdentifier: ({ defaultIdentifier }) => {
      return `${defaultIdentifier.replace(`${fileName}-ts-`, '').toLocaleLowerCase()}`
    },
    // Set snapshot directory to __image_snapshots__/{filename}.
    customSnapshotsDir: path.join(__dirname, '__tests__', '__image_snapshots__', fileName),
  })
}

export default configureSnapshots

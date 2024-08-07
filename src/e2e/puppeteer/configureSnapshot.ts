/* Visual regression tests
 * Snapshot Directory: ./__image_snapshots__/{platform}/{filename}
 * Run `jest -u` to update failed snapshots.
 * Press i in jest watch to update failing snapshots interactively.
 * See: https://github.com/americanexpress/jest-image-snapshot
 */
import { configureToMatchImageSnapshot } from 'jest-image-snapshot'
import os from 'os'
import path from 'path'

const snapshotDirectory = os.platform() === 'darwin' ? 'macos' : 'ubuntu'

/** Configures snapshot test settings. */
export function createImageSnapshotConfig({ fileName }: { fileName: string }) {
  return configureToMatchImageSnapshot({
    /** Apply a Gaussian Blur on compared images (radius in pixels). Used to normalize small rendering differences between platforms. */
    // blur of 1.25 and threshold of 0.2 has false negatives
    // blur of 2 and threshold of 0.1 has false negatives
    // blur of 2.5 and threshold of 0.1 has false negatives
    // blur of 1.5 and threshold of 0.175 has NO false negatives (false positives untested)
    blur: 1.5,
    customDiffConfig: {
      // per-pixel failure threshold (percent)
      // puppeteer anti-aliasing (?) commonly creates small differences in text and svg rendering at different font sizes, so increase the threshold
      threshold: 0.2,
    },
    // Full picture failure threshold (pixels)
    // 4 pixels definitely has false positives.
    // 14 px definitely has false negatives.
    // Hopefully 8 is the sweet spot.
    failureThreshold: 8,
    // custom identifier for snapshots based on the title of the test
    customSnapshotIdentifier: ({ defaultIdentifier }) => {
      return `${defaultIdentifier.replace(`${fileName}-ts-src-e-2-e-puppeteer-tests-${fileName}-ts-`, '').toLocaleLowerCase()}`
    },
    // Setting snapshot directory to __image_snapshots__/{platform} to avoid conflicts between platforms.
    customSnapshotsDir: path.join(__dirname, '__tests__', '__image_snapshots__', snapshotDirectory, fileName),
  })
}

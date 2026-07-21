import { Capacitor } from '@capacitor/core'
import storage from '../../util/storage'
import { tsid } from '../thoughtspaceSession'

export type TreecrdtSessionLockStatus = 'acquired' | 'unavailable' | 'unsupported'

let statusPromise: Promise<TreecrdtSessionLockStatus> | null = null

/**
 * Acquires an origin-wide, page-lifetime lock before the persistent TreeCRDT database is opened.
 *
 * The callback deliberately remains pending. The browser releases the Web Lock automatically when
 * the page is closed or navigated away from, allowing another tab to safely open the same OPFS file.
 */
export const acquireTreecrdtSessionLock = (): Promise<TreecrdtSessionLockStatus> => {
  // In-memory tests do not share persistent storage. Native apps cannot open a second browser tab.
  if (storage.getItem('treecrdtStorage') === 'memory' || Capacitor.isNativePlatform()) {
    return Promise.resolve('acquired')
  }

  if (!navigator.locks) return Promise.resolve('unsupported')
  if (statusPromise) return statusPromise

  statusPromise = new Promise(resolve => {
    void navigator.locks
      .request(`em-treecrdt-session:${tsid}`, { ifAvailable: true, mode: 'exclusive' }, async lock => {
        if (!lock) {
          resolve('unavailable')
          return
        }

        resolve('acquired')
        await new Promise<void>(() => undefined)
      })
      .catch(() => resolve('unsupported'))
  })

  return statusPromise
}

export default acquireTreecrdtSessionLock

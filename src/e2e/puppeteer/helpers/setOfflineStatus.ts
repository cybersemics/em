import OfflineStatus from '../../../@types/OfflineStatus'
import { WindowEm } from '../../../initialize'
import { page } from '../session'

/**
 * Set the offline connection status, which drives whether EmptyThoughtspace renders its loading
 * indicator.
 *
 * The loading phase normally lasts only as long as the initial connection takes, which is not long
 * enough to interact with and cannot be timed reliably. Setting the status directly makes both the
 * appearance ('connecting') and the disappearance ('connected') of the loading indicator
 * deterministic, without altering animation timing or any other environment-wide test behavior.
 *
 * Arrange-phase test environment control: use it to reach the loading state, not to perform the
 * behavior under test. Needs no cleanup because every test runs in a fresh incognito context.
 */
const setOfflineStatus = async (status: OfflineStatus) => {
  await page.evaluate((status: OfflineStatus) => {
    const em = window.em as WindowEm
    em.offlineStatusStore.update(status)
  }, status)
}

export default setOfflineStatus

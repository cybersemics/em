import { page } from '../session'

/** Acknowledges the AI data disclosure on the device, as a user who has already opted in to AI functionality has.
 * Without it, the first AI command shows the disclosure modal instead of executing (see aiDisclosure.ts). */
const acknowledgeAiDisclosure = () =>
  page.evaluate(() => {
    localStorage.setItem('aiDisclosureAcknowledged/v1', '1')
  })

export default acknowledgeAiDisclosure

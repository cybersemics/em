/**
 * What the app wants from the help genie: whether it is out, where it has been sent, and whether it can run on this
 * device. The genie's moment-to-moment motion is not here; it changes every frame and lives in the animation itself.
 * See components/HelpGenie and docs/learning.md.
 */
interface HelpGenieState {
  /** Whether the genie is flying over the app. */
  visible: boolean
  /** The viewport point, in CSS pixels, the genie was last sent to with moveHelpGenie. Null until it is sent anywhere. */
  target: { x: number; y: number } | null
  /** Whether the genie failed to start this session. Its buttons are disabled while this is true. Cleared on reload. */
  unavailable: boolean
}

export default HelpGenieState

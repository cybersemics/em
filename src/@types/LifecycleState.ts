/** States passed to page-lifecycle's statechange event handler.
 * Only the active, passive, and hidden states are available in Javascript.
 * See: https://stackoverflow.com/a/66286310/480608. */
type LifecycleState = 'active' | 'passive' | 'hidden' | 'frozen' | 'terminated' | 'discarded'

export default LifecycleState

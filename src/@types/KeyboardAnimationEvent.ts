/** Native IME animation metadata, expressed in CSS pixels and monotonic milliseconds. */
interface KeyboardAnimationEvent {
  id: number
  stage: 'prepare' | 'start' | 'anchor' | 'end'
  fromHeight: number
  toHeight: number
  durationMs: number
  curve?: number[]
  epochMs?: number
}

export default KeyboardAnimationEvent

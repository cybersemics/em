/** Android IME metadata. Heights include navigation in CSS pixels; times use the native monotonic clock. */
interface AndroidKeyboardAnimationEvent {
  id: number
  stage: 'start' | 'anchor' | 'geometry' | 'end' | 'snapshot'
  fromHeight?: number
  toHeight: number
  durationMs?: number
  curve?: number[]
  epochMs?: number
}

export default AndroidKeyboardAnimationEvent

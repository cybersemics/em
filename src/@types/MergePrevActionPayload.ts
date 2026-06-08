// Some edits related to formatting, e.g. stripping empty tags or applying foreground and background color as part of the same command, are constrained
// in ways that force them to be applied as separate actions. It is necessary to force-merge them into a single undo step even when it goes against
// editThought merge rules in undoRedoEnhancer (#3905).
interface MergePrevActionPayload {
  mergePrev?: boolean
}

export default MergePrevActionPayload

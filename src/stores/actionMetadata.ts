import reactMinistore from './react-ministore'

export type SetCursorActionMetadata = {
  userGenerated: boolean
}

// This can eventually be a discriminated union
export type ActionMetadata = (SetCursorActionMetadata & { type: 'setCursor' }) | { type: '' }

/** A store that hold optional metadata for the most-recently-dispatched action. */
const actionMetadataStore = reactMinistore<ActionMetadata>({ type: '' })

export default actionMetadataStore

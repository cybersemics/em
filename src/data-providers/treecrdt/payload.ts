export type ThoughtPayload = {
  value: string
  created: number
  lastUpdated: number
  updatedBy: string
  archived?: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Encodes a thought payload to bytes. */
export function encodeThoughtPayload(payload: ThoughtPayload): Uint8Array {
  return encoder.encode(JSON.stringify(payload))
}

/** Decodes bytes to a thought payload. */
export function decodeThoughtPayload(bytes: Uint8Array): ThoughtPayload {
  return JSON.parse(decoder.decode(bytes)) as ThoughtPayload
}

import { REGEXP_TAGS } from '../constants'

/** Strips all html tags. */
export const stripTags = (s: string) => s.replace(REGEXP_TAGS, '')

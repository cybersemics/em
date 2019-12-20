import { THOUGHT_ELLIPSIZED_CHARS } from '../constants.js'

export const ellipsize = s => s.length > THOUGHT_ELLIPSIZED_CHARS ? s.slice(0, THOUGHT_ELLIPSIZED_CHARS) + '...' : s

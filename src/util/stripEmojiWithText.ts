
import emojiStrip from 'emoji-strip'

/** Strips emoji from text. Preserves emoji on its own. */
export const stripEmojiWithText = (s: string) => {
  const stripped = emojiStrip(s)
  return stripped.length > 0 ? stripped : s
}

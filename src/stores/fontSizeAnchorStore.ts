import ministore from './ministore'

/** What the next font size change holds still in the viewport while the thoughts are laid out at the new size: the cursor, or the footer when its font size buttons made the change, so that they stay under the pointer. LayoutTree takes it when the font size changes, and sets it back to the cursor. */
const fontSizeAnchorStore = ministore<'cursor' | 'footer'>('cursor')

export default fontSizeAnchorStore

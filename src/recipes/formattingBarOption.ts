import { defineRecipe } from '@pandacss/dev'

/** A picker option in the Formatting Bar's popover. The selected option is marked by a rounded tile that FormattingBarPickerButton draws behind its icon, so that the tile can slide from one option to the next. */
const formattingBarOptionRecipe = defineRecipe({
  className: 'formatting-bar-option',
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
    padding: 0,
    lineHeight: 0,
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    color: 'formattingBarIcon',
    cursor: 'pointer',
  },
})

export default formattingBarOptionRecipe

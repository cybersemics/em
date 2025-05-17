import { defineSlotRecipe } from '@pandacss/dev'

/** Define heights for the gradient that indicates content/scrollability, and
 * the bottom spacer. */
const gradientHeight = 48
const contentBottomSpacerHeight = gradientHeight / 2

const dialogRecipe = defineSlotRecipe({
  className: 'dialog',
  slots: ['overlay', 'container', 'title', 'content', 'gradient', 'titleContainer', 'contentBottomSpacer'],
  base: {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'bgOverlay50',
      zIndex: 'dialogContainer',
      overflow: 'hidden',
    },
    container: {
      backgroundColor: 'bg',
      color: 'fg',
      padding: '0.8rem 0.8rem 0',
      borderRadius: '8px',
      maxWidth: '500px',
      width: '80%',
      border: '2px solid {colors.fgOverlay50}',
      overflow: 'hidden',
      position: 'relative',
      maxHeight: '80dvh',
    },
    titleContainer: {
      display: 'flex',
      justifyContent: 'space-between',
    },
    title: {
      fontWeight: '700',
      color: 'fg',
      borderBottom: 'none',
      fontSize: '1.4rem',
      margin: '0.7rem',
      '@media (min-width: 1200px)': {
        fontSize: '2rem',
      },
    },
    content: {
      fontSize: '1.25rem',
      color: 'fg',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '1rem',
      scrollbarColor: '{colors.fg} {colors.bg}',
      scrollbarWidth: 'thin',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'bg',
      },
      position: 'relative',
      '@media (min-width: 1200px)': {
        fontSize: '1.7rem',
      },
    },
    gradient: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      marginRight: 20,
      height: `${gradientHeight}px`,
      background: 'linear-gradient(to top, {colors.bg} 0%, transparent 100%)',
      pointerEvents: 'none',
      display: 'block',
    },
    contentBottomSpacer: {
      height: `${contentBottomSpacerHeight}px`,
    },
  },
})

export default dialogRecipe

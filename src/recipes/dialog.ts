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
      backgroundColor: 'transparent',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 'dialogContainer',
      overflow: 'hidden',
      touchAction: 'none',
    },
    container: {
      color: 'fg',
      padding: '0.711rem 0.711rem 0',
      borderRadius: '32px',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      maxHeight: '80dvh',
      opacity: .8,
    },
    titleContainer: {
      display: 'flex',
      justifyContent: 'space-between',
    },
    title: {
      fontWeight: '700',
      color: 'fg',
      borderBottom: 'none',
      fontSize: '1.244rem',
      margin: '0.622rem',
      '@media (min-width: 1200px)': {
        fontSize: '1.778rem',
      },
    },
    content: {
      fontSize: '1.11rem',
      color: 'fg',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '0.5rem',
      scrollbarColor: '{colors.fg} {colors.bg}',
      scrollbarWidth: 'thin',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      position: 'relative',
      '@media (min-width: 1200px)': {
        fontSize: '1.51rem',
      },
      overscrollBehavior: 'contain',
    },
    gradient: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      marginRight: 20,
      height: `${gradientHeight}px`,
      background: 'linear-gradient(to top, rgba(0, 0, 0, 0.4) 0%, transparent 100%)',
      pointerEvents: 'none',
      display: 'block',
    },
    contentBottomSpacer: {
      height: `${contentBottomSpacerHeight}px`,
    },
  },
})

export default dialogRecipe

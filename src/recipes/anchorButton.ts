import { defineRecipe } from '@pandacss/dev'
import extendTapRecipe from './extendTap'

const anchorButtonRecipe = defineRecipe({
  className: 'anchor-button',
  description: 'Styles for <a> buttons',
  base: {
    padding: '0.5em 2em',
    minWidth: '6em',
    textDecoration: 'none',
    display: 'inline-block',
    borderRadius: '99px',
    color: 'bg',
    backgroundColor: 'fg',
    // '&:active:': { // this was in App.css, appears to be overridden though by &:hover, &:active below, found in global styles
    //   backgroundColor: { base: '#111', _dark: '#dcdcdc' },
    // },
    // increase specificity to override .popup .modal-actions
    '&:hover, &:active': {
      backgroundColor: 'fg85',
    },
  },
  variants: {
    isDisabled: {
      true: {
        opacity: 0.25,
        pointerEvents: 'none',
        userSelect: 'none',
        cursor: 'auto',
      },
    },
    actionButton: {
      true: {
        display: 'inline-flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 100ms ease-in-out',
      },
    },
    extendTap: {
      // overrides default button padding
      true: extendTapRecipe.base!,
    },
    small: {
      true: {
        padding: '2px 0',
        fontSize: '90%',
      },
    },
    thin: {
      true: {
        paddingTop: '2px',
        paddingBottom: '2px',
        marginTop: '2px',
        marginBottom: '2px',
      },
    },
    smallGapX: {
      true: {
        marginLeft: 5,
        marginRight: 5,
      },
    },
    lessPadding: {
      true: {
        padding: '4px 12px',
      },
    },
    variableWidth: {
      true: {
        minWidth: 'auto',
      },
    },
    dim: {
      true: {
        opacity: 0.5,
      },
    },
    inActive: {
      true: {
        backgroundColor: 'exportTextareaColor',
      },
    },
    inverse: {
      true: {
        backgroundColor: 'gray15',
        border: `solid 1px {colors.gray50}`,
        color: 'fg',
      },
    },
    outline: {
      true: {
        backgroundColor: 'bg',
        border: `solid 1px {colors.fg}`,
        color: 'fg',
        // TODO: make sure this works
        '&:hover, &:active': {
          backgroundColor: 'gray15',
        },
      },
    },
  },
  compoundVariants: [
    {
      actionButton: true,
      isDisabled: true,
      css: {
        opacity: 0.5,
      },
    },
  ],
  staticCss: ['*'],
})

export default anchorButtonRecipe

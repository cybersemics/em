import { defineRecipe } from '@pandacss/dev'

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
    disabled: {
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
    small: {
      true: {
        padding: '2px 0',
        fontSize: '90%',
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
        // TODO: handle light mode
        // was originally part of .popup .modal-actions a.button.button-inactive
        // however, looks like nothing is using it
        backgroundColor: '#aaa',
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
      disabled: true,
      css: {
        opacity: 0.5,
      },
    },
  ],
})

export default anchorButtonRecipe

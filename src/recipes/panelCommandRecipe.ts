import { defineRecipe } from '@pandacss/dev'

export default defineRecipe({
  className: 'panelCommandRecipe',
  base: {
    display: 'grid',
    gridTemplateColumns: 'auto',
    minHeight: '3rem',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    padding: '0.5rem',
    borderRadius: '16px',
    backgroundColor: 'gray15',
    cursor: 'pointer',
    transition: 'opacity {durations.medium} ease, background-color {durations.medium} ease',
    opacity: 1,

    // Add pseudo-selector styling
    '.panelCommandGroupRecipe > &:first-of-type': {
      borderRadius: '16px 0 0 16px',
    },
    '.panelCommandGroupRecipe > &:last-of-type': {
      borderRadius: '0 16px 16px 0',
    },
    '.panelCommandGroupRecipe > &:not(:first-of-type):not(:last-of-type)': {
      borderRadius: '0',
    },
  },
  variants: {
    size: {
      small: {
        gridTemplateColumns: 'auto',
        gridColumn: 'span 1',
      },
      medium: {
        gridTemplateColumns: '1fr 2fr',
        gridColumn: 'span 2',
      },
      large: {
        gridTemplateColumns: 'auto',
        gridColumn: 'span 2',
      },
      xlarge: {
        gridTemplateColumns: 'auto',
        gridColumn: 'span 4',
      },
    },
    isButtonExecutable: {
      true: {
        opacity: 1,
        cursor: 'pointer',
      },
      false: {
        opacity: 0.5,
      },
    },
    isButtonActive: {
      true: {
        backgroundColor: 'purple',
      },
      false: {
        backgroundColor: 'gray15',
      },
    },
  },
  defaultVariants: {
    size: 'small',
    isButtonExecutable: true,
    isButtonActive: false,
  },
  staticCss: [
    {
      size: ['small', 'medium', 'large', 'xlarge'],
      isButtonExecutable: ['true', 'false'],
      isButtonActive: ['true', 'false'],
    },
  ],
})

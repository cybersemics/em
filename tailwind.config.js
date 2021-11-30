// tailwind.config.js
const colors = require('tailwindcss/colors')
module.exports = {
  theme: {
    extend: {
      transitionProperty: {
        spacing: 'margin, padding',
      },
      zIndex: {
        modal: '10',
      },
      colors: {
        gray: colors.trueGray,
      },
    },
  },
  darkMode: 'class',
}

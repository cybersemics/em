// https://panda-css.com/docs/references/config
import { defineConfig, defineGlobalStyles, defineKeyframes } from '@pandacss/dev'
import anchorButtonRecipe from './src/recipes/anchorButton'
import buttonRecipe from './src/recipes/button'
import editableRecipe from './src/recipes/editable'
import extendTapRecipe from './src/recipes/extendTap'
import iconRecipe from './src/recipes/icon'
import linkRecipe from './src/recipes/link'
import modalRecipe from './src/recipes/modal'
import modalTextRecipe from './src/recipes/modalText'
import multilineRecipe from './src/recipes/multiline'
import thoughtRecipe from './src/recipes/thought'
import tutorialBulletRecipe from './src/recipes/tutorialBullet'
import upperRightRecipe from './src/recipes/upperRight'
import convertColorsToPandaCSS from './src/util/convertColorsToPandaCSS'

const { colorTokens, colorSemanticTokens } = convertColorsToPandaCSS()

const keyframes = defineKeyframes({
  fademostlyin: {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 0.85,
    },
  },
  fadein: {
    from: {
      opacity: 0,
    },
    to: {
      opacity: 0.99,
    },
  },
  pulse: {
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0.25,
    },
  },
  pulseLight: {
    from: {
      opacity: 1,
    },
    to: {
      opacity: 0.5,
    },
  },
  preventAutoscroll: {
    '0%': {
      opacity: 0,
    },
    '100%': {
      opacity: 1,
    },
  },
  ripple_loader: {
    '0%': {
      top: '100%',
      left: '100%',
      width: '0',
      height: '0',
      opacity: 1,
    },
    '100%': {
      top: '7.14%',
      left: '7.14%',
      width: '162.5%',
      height: '162.5%',
      opacity: 0,
    },
  },
})

const globalCss = defineGlobalStyles({
  /* z-index schedule
   Keep these in one place to make it easier to determine interactions and prevent conflicts.
   Javascript should use z-index-* classnames so that z-indexes themselves are all defined here. */
  ':root': {
    '--z-index-popup': '1500',
    '--z-index-gesture-trace': '50',
    '--z-index-command-palette': '45',
    '--z-index-modal': '40',
    '--z-index-toolbar-container': '20',
    '--z-index-toolbar-overlay': '15',
    '--z-index-toolbar-arrow': '15',
    '--z-index-toolbar': '10',
    '--z-index-navbar': '10',
    '--z-index-latest-shortcuts': '10',
    '--z-index-drop-empty': '6',
    '--z-index-subthoughts-drop-end': '5',
    '--z-index-tutorial': '3',
    '--z-index-scroll-zone': '2',
    '--z-index-thought-annotation-link': '2',
    '--z-index-resizer': '2',
    '--z-index-bullet': '2',
    '--z-index-stack': '1',
    '--z-index-hide': '-1',
    '--safe-area-top': 'env(safe-area-inset-top)',
    '--safe-area-bottom': 'env(safe-area-inset-bottom)',
  },
  'html, body, #root, #app': { height: '100%', fontSize: '16px' },
  'body, textarea': {
    fontWeight: 300,
    fontFamily: "'Helvetica'",
    lineHeight: 1.25,
  },
  /* Disables pull-to-refresh but allows overscroll glow effects. */
  body: { overscrollBehaviorY: 'contain', color: 'fg', backgroundColor: 'bg' },
  button: { fontSize: '1.2em' },
  a: {
    cursor: 'pointer',
    textDecorationLine: 'underline',
    outline: 'none',
    color: { base: '#1b6f9a', _dark: '#87ceeb' },
    fontWeight: 400,
    userSelect: 'none',
  },
  h1: {
    fontSize: '32px',
    fontWeight: 400,
    marginTop: '0',
    marginBottom: '12px',
  },
  h2: {
    fontSize: '100%',
    fontWeight: 300,
    borderBottom: 'solid 1px {colors.fg}',
    marginBottom: '25px',
  },
  ul: { marginLeft: '1.5em', paddingLeft: '0' },
  'ul ul': { marginLeft: '1.2em' },
  li: { listStyle: 'none' },
  input: {
    color: 'fg',
    border: 'solid 1px {colors.bgMuted}',
    backgroundColor: 'bg',
  },
  "input[type='email'], input[type='password'], input[type='text']": {
    width: '40%',
    minWidth: '300px',
    display: 'block',
    margin: '0 auto',
    padding: '10px',
    fontSize: '16px',
    border: 'solid 1px {colors.bgMuted}',
    borderRadius: '5px',
    marginBottom: '2vh',
  },
  'input:focus': {
    border: {
      base: 'solid 1px #eee',
      _dark: 'solid 1px #999',
    },
    outline: '0 none',
  },
  /** Aligns checkbox and label vertically. */
  "input[type='checkbox']": {
    verticalAlign: 'middle',
    position: 'relative',
    bottom: '1px',
  },
  label: { display: 'block' },
  textarea: {
    width: 'calc(100% - 40px)',
    display: 'block',
    margin: '0 auto',
    height: '50vh',
    padding: '10px',
    fontSize: '16px',
    border: 'solid 1px {colors.bgMuted}',
    color: 'fg',
    backgroundColor: 'bg',
  },
  code: {
    backgroundColor: { base: '#ccc', _dark: '#333' },
    fontFamily: 'monospace',
  },
  'button[disabled]': {
    opacity: 0.25,
    pointerEvents: 'none',
    userSelect: 'none',
    cursor: 'auto',
  },
  '[contenteditable]': {
    outline: 'none',
    userSelect: 'text',
  },
  /* empty class is set dynamically by javascript during editing. */
  /* :empty does not work because thought may contain <br> */
  '[placeholder]:empty::before': {
    fontStyle: 'italic',
    color: { base: 'rgba(7, 7, 7, 0.5)', _dark: 'rgba(255, 255, 255, 0.5)' },
    content: 'attr(placeholder)',
    cursor: 'text',
  },
  // Sets default link color in recipes/modal color
  '.modal__root': {
    '& p': { margin: '0 0 1em 0' },
  },
  '.modal__actions': {
    '& a': {
      fontWeight: 'normal',
      margin: '0 5px',
      textDecoration: 'underline',
      whiteSpace: 'nowrap',
      lineHeight: 2,
      color: 'fg',
    },
  },
})

export default defineConfig({
  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // Disable style props on JSX components
  jsxStyleProps: 'none',

  // Disable Panda-specific shorthand properties
  shorthands: false,

  // Useful for theme customization
  theme: {
    extend: {
      keyframes,
      tokens: {
        colors: colorTokens,
        fontSizes: {
          sm: {
            value: '80%',
          },
          md: {
            value: '90%',
          },
        },
        sizes: {
          minThoughtHeight: { value: '1.9em' },
        },
        spacing: {
          modalPadding: { value: '8%' },
          safeAreaTop: { value: 'env(safe-area-inset-top)' },
          safeAreaBottom: { value: 'env(safe-area-inset-bottom)' },
        },
        zIndex: {
          popup: { value: 1500 },
          gestureTrace: { value: 50 },
          commandPalette: { value: 45 },
          modal: { value: 40 },
          hamburgerMenu: { value: 30 },
          sidebar: { value: 25 },
          toolbarContainer: { value: 20 },
          toolbarOverlay: { value: 15 },
          toolbarArrow: { value: 15 },
          toolbar: { value: 10 },
          navbar: { value: 10 },
          latestShortcuts: { value: 10 },
          tutorialTraceGesture: { value: 5 },
          dropEmpty: { value: 6 },
          subthoughtsDropEnd: { value: 5 },
          tutorial: { value: 3 },
          scrollZone: { value: 2 },
          thoughtAnnotationLink: { value: 2 },
          resizer: { value: 2 },
          bullet: { value: 2 },
          stack: { value: 1 },
          hide: { value: -1 },
        },
      },
      recipes: {
        icon: iconRecipe,
        anchorButton: anchorButtonRecipe,
        button: buttonRecipe,
        link: linkRecipe,
        extendTap: extendTapRecipe,
        thought: thoughtRecipe,
        editable: editableRecipe,
        multiline: multilineRecipe,
        tutorialBullet: tutorialBulletRecipe,
        upperRight: upperRightRecipe,
      },
      slotRecipes: {
        modal: modalRecipe,
        modalText: modalTextRecipe,
      },
      semanticTokens: {
        colors: {
          ...colorSemanticTokens,
          bgMuted: {
            value: {
              base: '#ddd',
              _dark: '#333',
            },
          },
          dim: {
            value: {
              base: 'rgba(7, 7, 7, 0.5)',
              _dark: 'rgba(255, 255, 255, 0.5)',
            },
          },
        },
        durations: {
          highlightPulseDuration: {
            value: {
              base: '500ms',
              _test: '0s',
            },
          },
          hoverPulseDuration: {
            value: {
              base: '300ms',
              _test: '0s',
            },
          },
          /** The animation duration for the slower opacity transition and horizontal shift of the LayoutTree as the depth of the cursor changes. */
          layoutSlowShiftDuration: {
            value: {
              base: '750ms',
              _test: '0s',
            },
          },
          /** The animation duration of a node in the LayoutTree component. */
          layoutNodeAnimationDuration: {
            value: {
              base: '150ms',
              _test: '0s',
            },
          },
        },
      },
    },
  },

  globalCss,

  conditions: {
    light: '[data-color-mode=light] &',
    dark: '[data-color-mode=dark] &',
    test: '[data-env=test] &',
    chrome: '[data-browser=chrome] &',
    safari: '[data-browser=safari] &',
    mobile: '[data-device=mobile] &',
    desktop: '[data-device=desktop] &',
    android: '[data-platform=android] &',
    mac: '[data-platform=mac] &',
    iphone: '[data-platform=iphone] &',
  },

  // The output directory for your css system
  outdir: 'styled-system',
  presets: [],
})

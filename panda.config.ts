// https://panda-css.com/docs/references/config
import { defineConfig, defineGlobalStyles, defineKeyframes } from '@pandacss/dev'
import durationsConfig from './src/durations.config'
import anchorButtonRecipe from './src/recipes/anchorButton'
import bulletRecipe from './src/recipes/bullet'
import buttonRecipe from './src/recipes/button'
import childRecipe from './src/recipes/child'
import dialogRecipe from './src/recipes/dialogRecipe'
import dropEndRecipe from './src/recipes/dropEnd'
import dropHoverRecipe from './src/recipes/dropHover'
import editableRecipe from './src/recipes/editable'
import extendTapRecipe from './src/recipes/extendTap'
import fadeTransitionRecipe from './src/recipes/fadeTransition'
import iconRecipe from './src/recipes/icon'
import invalidOptionRecipe from './src/recipes/invalidOption'
import linkRecipe from './src/recipes/link'
import modalRecipe from './src/recipes/modal'
import modalActionLinkRecipe from './src/recipes/modalActionLink'
import modalTextRecipe from './src/recipes/modalText'
import panelCommandGroupRecipe from './src/recipes/panelCommandGroupRecipe'
import panelCommandRecipe from './src/recipes/panelCommandRecipe'
import slideTransitionRecipe from './src/recipes/slideTransition'
import textNoteRecipe from './src/recipes/textNote'
import thoughtRecipe from './src/recipes/thought'
import toolbarPointerEventsRecipe from './src/recipes/toolbarPointerEvents'
import tutorialBulletRecipe from './src/recipes/tutorialBullet'
import convertColorsToPandaCSS from './src/util/convertColorsToPandaCSS'
import keyValueBy from './src/util/keyValueBy'

const { colorTokens, colorSemanticTokens } = convertColorsToPandaCSS()

type DurationToken = {
  value: {
    base: string
    _test: string
  }
}

/** Returns durations formatted for the PandaCSS config. */
const durationsReducer = (pv: Record<string, DurationToken>, [key, duration]: [string, number]) => {
  pv[key] = {
    value: {
      base: `${duration}ms`,
      _test: '0ms',
    },
  }

  return pv
}

/**
 * Generates zIndex value entries in descending order from [n...1].
 * @example zIndexDescending(['a', 'b', 'c']) => { a: { value: 3 }, b: { value: 2 }, c: { value: 1 } }
 */
const zIndexDescending = (keys: string[]) => keyValueBy(keys.reverse(), (key, i) => ({ [key]: { value: i + 1 } }))

/** Add `ms` units to raw value. */
const durations = Object.entries(durationsConfig).reduce(durationsReducer, {})

/** FauxCaret.tsx uses these variables to decide which faux caret to show. */
const hideCaret = {
  '0%': {
    '--faux-caret-opacity': 0,
    '--faux-caret-line-start-opacity': 1,
    '--faux-caret-line-end-opacity': 1,
    '--faux-caret-note-line-end-opacity': 1,
    '--faux-caret-note-line-start-opacity': 1,
    caretColor: 'transparent',
  },
  /** The distributed asynchronous nature of the faux caret leads to situations where the animation
   * begins before the caret is correctly repositioned. Delaying its appearance for at least 1 frame
   * will eliminate these glitches.
   */
  '2.5%': {
    '--faux-caret-opacity': 1,
  },
  '99%': {
    '--faux-caret-opacity': 1,
    '--faux-caret-line-start-opacity': 1,
    '--faux-caret-line-end-opacity': 1,
    '--faux-caret-note-line-end-opacity': 1,
    '--faux-caret-note-line-start-opacity': 1,
    caretColor: 'transparent',
  },
  '100%': {
    '--faux-caret-opacity': 0,
    '--faux-caret-line-start-opacity': 0,
    '--faux-caret-line-end-opacity': 0,
    '--faux-caret-note-line-end-opacity': 0,
    '--faux-caret-note-line-start-opacity': 0,
    caretColor: 'auto',
  },
}

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
  pulseBackgroundHighlight: {
    from: {
      backgroundColor: 'highlight0',
    },
    to: {
      backgroundColor: 'highlight10',
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
  ellipsis: {
    to: {
      width: '1.25em',
    },
  },
  tofg: {
    to: {
      color: 'fg',
      fill: 'fg',
    },
  },
  bobble: {
    '0%': {
      transform: 'translateX(-50%) translateY(0)',
    },
    '50%': {
      transform: 'translateX(-50%) translateY(10px)',
    },
    '100%': {
      transform: 'translateX(-50%) translateY(0)',
    },
  },
  /**
   * Clone drop animation: translate to destination and apply subtle fade/scale.
   * Combines translate and scale in a single transform to avoid property conflicts.
   * Uses CSS vars (--clone-dx, --clone-dy) set per-instance for dynamic positioning.
   */
  cloneDragToCollapsed: {
    from: {
      transform: 'translate(0, 0) scale(1)',
      opacity: 1,
    },
    to: {
      transform: 'translate(var(--clone-dx, 0px), var(--clone-dy, 0px)) scale(0.985)',
      opacity: 0.98,
    },
  },
  bulletGrow: {
    '0%': { transform: 'scale3d(1, 1, 1)' },
    '70%': { transform: 'scale3d(1.2, 1.2, 1)' },
    '100%': { transform: 'scale3d(1, 1, 1)' },
  },
  /**
   * These keyframes define a scroll hint fade at the top and bottom of the
   * Dialog's scrollable `content`. The scroll hint fades in when there's scrollable
   * content, and fades out when the user is at either extreme.
   *
   * `mask-image` can't be animated directly, so instead we animate a custom
   * property that `mask-image`'s gradient references. The browser can then
   * interpolate that value smoothly, updating the gradient without the need
   * for JavaScript.
   *
   * This value defines how far the user needs to scroll from the top edge to reveal the fade.
   */
  dialogContentScrollFade: {
    to: {
      '--dialog-content-mask-fade-top': '2.2rem',
    },
  },
  /**
   * Bottom-edge counterpart. The bottom fade is on by default as a scrollability cue.
   * As the user reaches the bottom, we want to fade that out to indicate that there's no more content below.
   * This value defines the distance from the bottom edge at which the fade is completely gone, revealing the full content.
   */
  dialogContentScrollFadeBottom: {
    to: {
      '--dialog-content-mask-fade-bottom': '0.25rem',
    },
  },
  // the hideCaret animation must run every time the indent changes on iOS Safari, which necessitates replacing the animation with an identical substitute with a different name
  // See: recipes/hideCaret.ts
  // TODO: FauxCaret will break if hideCaretAnimationNames is imported from hideCaret.config.ts into hideCaret.ts, and vice versa into panda.config.ts, so we are stuck with duplicate definitions in two files.
  ...[
    'hideCaret0',
    'hideCaret1',
    'hideCaret2',
    'hideCaret3',
    'hideCaret4',
    'hideCaret5',
    'hideCaret6',
    'hideCaret7',
    'hideCaret8',
    'hideCaret9',
    'hideCaretA',
    'hideCaretB',
    'hideCaretC',
    'hideCaretD',
    'hideCaretE',
    'hideCaretF',
    'hideCaretG',
    'hideCaretH',
    'hideCaretI',
    'hideCaretJ',
    'hideCaretK',
    'hideCaretL',
    'hideCaretM',
    'hideCaretN',
    'hideCaretO',
    'hideCaretP',
    'hideCaretQ',
    'hideCaretR',
    'hideCaretS',
    'hideCaretT',
    'hideCaretU',
    'hideCaretV',
  ].reduce((accum, name) => ({ ...accum, [name]: hideCaret }), {}),
})

const globalCss = defineGlobalStyles({
  '*': {
    _mobile: {
      _dragInProgress: {
        userSelect: 'none',
      },
    },
    _test: {
      // Caret should be invisible in puppeteer tests as the blink timing differs between runs and will fail the screenshot tests.
      // Do this here rather than programmatically in order to avoid an extra page.evaluate.
      caretColor: 'transparent',
    },
  },
  'html, body, #root, #app': { height: '100%', fontSize: '16px' },
  'body, textarea': {
    fontWeight: 300,
    fontFamily: "'Helvetica'",
    lineHeight: 1.25,
  },
  // override default font-weight of 400 which breaks document.execCommand in Chrome v135
  b: {
    fontWeight: 600,
  },
  /* Disables pull-to-refresh but allows overscroll glow effects. */
  body: { overscrollBehaviorY: 'contain', color: 'fg', backgroundColor: 'bg' },
  button: { fontSize: '1.2em' },
  a: {
    cursor: 'pointer',
    textDecorationLine: 'underline',
    outline: 'none',
    color: 'link',
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
    border: 'solid 1px {colors.inputBorder}',
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
    backgroundColor: 'codeBg',
    fontFamily: 'monospace',
  },
  kbd: {
    fontFamily: 'inherit',
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
    color: 'var(--placeholder-color, {colors.dim})',
    backgroundColor: 'var(--placeholder-background-color, transparent)',
    content: 'attr(placeholder)',
    cursor: 'text',
  },
  '[placeholder][data-placeholder-bold]:empty::before': {
    fontWeight: 700,
  },
  '[placeholder][data-placeholder-italic]:empty::before': {
    fontStyle: 'italic',
  },
  '[placeholder][data-placeholder-underline]:empty::before': {
    textDecorationLine: 'underline',
  },
  '[placeholder][data-placeholder-strikethrough]:empty::before': {
    textDecorationLine: 'line-through',
  },
  '[placeholder][data-placeholder-underline][data-placeholder-strikethrough]:empty::before': {
    textDecorationLine: 'underline line-through',
  },
  '[placeholder][data-placeholder-code]:empty::before': {
    backgroundColor: 'var(--placeholder-background-color, {colors.codeBg})',
    fontFamily: 'monospace',
  },
  // PandaCSS does not directly support fallbacks: https://github.com/chakra-ui/panda/discussions/846
  ':root': {
    '--active-glow-gradient':
      'linear-gradient(180deg, {colors.commandCenterBlue} 0%, {colors.commandCenterPurple} 100%)',
    '--safe-area-inset-bottom': 'env(safe-area-inset-bottom)',
  },
  '@supports (background-image: linear-gradient(180deg in oklch, #000))': {
    ':root': {
      '--active-glow-gradient':
        'linear-gradient(180deg in oklch, {colors.commandCenterBlue} 0%, {colors.commandCenterPurple} 100%)',
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
      breakpoints: {
        sm: '320px', // approx size of iPhone SE
        md: '400px', // approx size of iPhone 12 Pro
        lg: '600px', // approx size of iPad
        xl: '768px', // approx size of landscape tablet or laptop
        '2xl': '1000px', // approx size of a desktop
        '3xl': '1200px', // approx size of a large desktop
      },
      tokens: {
        colors: colorTokens,
        easings: {
          // Ease in even slower at the beginning of the animation.
          // For reference, ease-in is equivalent to cubic-bezier(.42, 0, 1, 1).
          easeInSlow: {
            value: 'cubic-bezier(.84, 0, 1, 1)',
          },
          easeInSmooth: {
            value: 'cubic-bezier(0.75, 0.00, 0.75, 0.90)',
          },
          nodeCurveXLayer: {
            value: 'cubic-bezier(0.8,0,0.2,0.2)',
          },
          nodeCurveYLayer: {
            value: 'cubic-bezier(0.8,0.8,0.2,1)',
          },
          nodeCurveXLayerClockwise: {
            value: 'cubic-bezier(0,0.8,0.2,0.8)',
          },
          nodeCurveYLayerClockwise: {
            value: 'cubic-bezier(0.8,0.2,0.8,1)',
          },
        },
        fonts: {
          radioCanada: { value: "'Radio Canada Big', sans-serif" },
        },
        fontSizes: {
          sm: { value: '80%' },
          md: { value: '90%' },
        },
        /** The width for drop hover bars during drag-and-drop operations. */
        sizes: {
          dropHover: { value: '50vw' },
        },
        spacing: {
          modalPadding: { value: '8%' },
          editablePaddingTop: { value: '0.375em' },
          editablePaddingBottom: { value: '0.25em' },
          safeAreaTop: { value: 'env(safe-area-inset-top)' },
          safeAreaRight: { value: 'env(safe-area-inset-right)' },
          safeAreaBottom: { value: 'env(safe-area-inset-bottom)' },
          safeAreaLeft: { value: 'env(safe-area-inset-left)' },
        },
        /* z-index schedule
        Keep these in one place to make it easier to determine interactions and prevent conflicts. */
        zIndex: {
          ...zIndexDescending([
            'dialog',
            'dialogContainer',
            'popup',
            'tip',
            'cloneDroppedThought',
            'hoverArrow',
            'gestureTrace',
            'gestureMenuBlur',
            'hamburgerMenu',
            'sidebar',
            'modal',
            'commandCenter',
            'commandCenterBlur',
            'footer',
            'toolbarContainer',
            'toolbarOverlay',
            'toolbarArrow',
            'toolbar',
            'navbar',
            'latestCommands',
            'tutorialTraceGesture',
            'dropEmpty',
            'subthoughtsDropEnd',
            'tutorial',
            'thoughtAnnotationLink',
            'resizer',
            'bullet',
            'stack',
            'content',
            'scrollZone',
          ]),
          hide: { value: -1 },
        },
      },
      recipes: {
        iconRecipe,
        childRecipe,
        anchorButtonRecipe,
        buttonRecipe,
        bulletRecipe,
        linkRecipe,
        extendTapRecipe,
        thoughtRecipe,
        editableRecipe,
        textNoteRecipe,
        modalActionLinkRecipe,
        toolbarPointerEventsRecipe,
        tutorialBulletRecipe,
        dropHoverRecipe,
        dropEndRecipe,
        invalidOptionRecipe,
        panelCommandGroupRecipe,
        panelCommandRecipe,
      },
      slotRecipes: {
        dialogRecipe,
        modalRecipe,
        modalTextRecipe,
        fadeTransitionRecipe,
        slideTransitionRecipe,
      },
      semanticTokens: {
        colors: {
          ...colorSemanticTokens,
          invalidOption: {
            value: 'tomato !important',
          },
        },
        durations,
        gradients: {
          activeGlow: {
            value: 'var(--active-glow-gradient)',
          },
        },
      },
    },
  },

  globalCss,

  /* Registering `--dialog-content-mask-fade-top` as a `<length>`
  is what makes the scroll-driven mask animation in dialogRecipe.ts
  interpolate smoothly.
  An unregistered custom property would animate as a discrete string
  swap and would flash in abruptly rather than smoothly animating. */
  globalVars: {
    '--dialog-content-mask-fade-top': {
      syntax: '<length>',
      inherits: false,
      initialValue: '0px',
    },
    // initialValue must be computationally independent per the CSS Properties & Values API spec —
    // rem isn't allowed (depends on root font-size), so we hardcode 60px (= 3.75rem at the 16px root
    // we set on html/body in index.css) to match the static plateau distance from the bottom edge.
    '--dialog-content-mask-fade-bottom': {
      syntax: '<length>',
      inherits: false,
      initialValue: '60px',
    },
  },

  conditions: {
    light: '[data-color-mode=light] &',
    dark: '[data-color-mode=dark] &',
    test: '[data-env=test] &',
    chrome: '[data-browser=chrome] &',
    safari: '[data-browser=safari] &',
    mobile: '[data-device=mobile] &',
    desktop: '[data-device=desktop] &',
    native: '[data-native=true] &',
    android: '[data-platform=android] &',
    mac: '[data-platform=mac] &',
    iphone: '[data-platform=iphone] &',
    dragHold: '[data-drag-hold=true] &',
    dragInProgress: '[data-drag-in-progress=true] &',
  },

  // The output directory for your css system
  outdir: 'styled-system',
  presets: [],
})

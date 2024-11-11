import { defineSlotRecipe } from '@pandacss/dev'

// default <a> color and <p> padding set in globalCss
const modalRecipe = defineSlotRecipe({
  slots: [
    'root',
    'title',
    'text',
    'actions',
    // below must be styled in descendant selectors, since not in ModalComponent
  ],
  className: 'modal',
  base: {
    root: {
      //   backgroundColor: 'white', // #333 for dark mode
      //   boxShadow: '2px 5px 5px rgba(0, 0, 0, 0.5)',
      //   border: 'solid 1px rgba(0, 0, 0, 0.2)', // solid 1px rgba(255, 255, 255, 0.1) for dark mode
      //   padding: '15px',
      color: '#e3e3e3',
      position: 'absolute',
      //   display: 'inline-block',
      lineHeight: 1.5,
      zIndex: 'modal',
      //   width: 'calc(100% - 100px)',
      //   zIndex: 'var(--z-index-modal)',
      // ^above are .modal styles, below are .popup
      animation: {
        base: 'fademostlyin 0.4s',
        _test: 'none',
      },
      minWidth: '200px',
      boxShadow: 'none',
      border: 'none',
      display: 'block',
      width: '100%',
      padding: '8%',
      boxSizing: 'border-box',
      backgroundColor: 'bg',
      transition: {
        base: 'all 0.4s ease-out',
        _test: 'none',
      },
      '& p': { margin: '0 0 1em 0' },
    },
    title: {
      //   fontWeight: 400, from
      fontWeight: 700,
      marginBottom: '40px',
      textAlign: 'center',
    },
    text: {
      marginBottom: '2em',
    },
    actions: {
      textAlign: 'center',
    },
  },
  variants: {
    id: {
      welcome: {
        root: { height: '100%', fontSize: '26px', paddingTop: '2em' },
        title: { marginBottom: '0', lineHeight: 1 },
        text: {
          marginTop: '2em',
          marginBottom: '2.5em',
          fontSize: '75%',
        },
        actions: { fontSize: '0.75em' },
      },
      auth: {},
      customizeToolbar: {},
      devices: {},
      export: {},
      feedback: {},
      invites: {},
      help: {},
      settings: {},
      signup: {},
      testGestureDiagram: {},
    },
    center: {
      true: {
        root: {
          textAlign: 'center',
          left: '0',
          right: '0',
          margin: '0 auto',
        },
      },
    },
  },
  staticCss: ['*'],
})

export default modalRecipe

import { defineSlotRecipe } from '@pandacss/dev'

// default <a> color and <p> padding set in globalCss
const modalRecipe = defineSlotRecipe({
  slots: [
    'root',
    'closeX',
    'content',
    'title',
    'text',
    'actions',
    'close',
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
      //   width: 'calc(100% - 100px)',
      //   zIndex: 'var(--z-index-modal)',
      // ^above are .modal styles, below are .popup
      animation: 'fademostlyin 0.4s',
      minWidth: '200px',
      boxShadow: 'none',
      border: 'none',
      display: 'block',
      width: '100%',
      padding: '8%',
      boxSizing: 'border-box',
      zIndex: 'popup',
      backgroundColor: 'bg',
      transition: 'all 0.4s ease-out',
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
    content: {
      maxWidth: '40em',
      margin: '0 auto',
      maxHeight: 'none',
      '& .button': {
        cursor: 'pointer',
        background: 'transparent',
        color: '#ccc',
        display: 'block',
        border: '0 none',
        margin: '10px auto 0',
      },
      '& .button:focus': {
        color: '#fff',
        outline: '0 none',
        border: '0 none',
      },
    },
    close: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      fontSize: '12px',
      verticalAlign: 'middle',
      textAlign: 'center',
      padding: '10px',
      display: 'none',
      '& span': {
        display: 'inline-block',
        width: '11px',
        height: '11px',
        color: {
          base: 'rgba(0, 0, 0, 0.3)',
          _dark: 'rgba(255, 255, 255, 0.3)',
        },
        borderColor: {
          base: 'rgba(0, 0, 0, 0.3)',
          _dark: 'rgba(255, 255, 255, 0.3)',
        },
      },
    },
    closeX: {
      /* extend click area */
      padding: '10px 20px',
      margin: '-10px -20px',
      position: 'fixed',
      top: 'calc(9px - 0.2em)',
      right: '11px',
      color: 'inherit',
      textDecoration: 'none',
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
      home: {
        // unused, from .modal-home, not sure what this is for
        root: {
          marginLeft: '20px',
          marginTop: '-5px',
        },
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
    stack: {
      true: {
        actions: {
          textAlign: 'center',
          '& a.button': {
            marginBottom: '1em',
          },
          '@media screen and (min-width: 480px)': {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            '& > *': {
              marginTop: '1em',
            },
            '& > :not(:last-child)': {
              marginRight: '1em',
            },
          },
        },
      },
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
    opaque: {
      true: {
        root: {
          animation: 'fadein 0.4s',
        },
      },
    },
  },
  jsx: ['Devices', 'Help', 'ShortcutTable', 'Auth', 'ModalComponent'],
  staticCss: ['*'],
})

export default modalRecipe

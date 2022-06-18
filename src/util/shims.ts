/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-global-assign */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-native-reassign */
import isMobile from './isMobile'

/*
This shim doesn't work properly it breaks whenever opening Expo Go dev tools.
*/
// @ts-ignore
window = !isMobile
  ? window
  : {
      getSelection: () => ({
        focusOffset: 0,
      }),
      location: {
        pathname: '',
      },
      decodeURIComponent: (str: string) => {
        return decodeURI(str)
      },
      setTimeout: setTimeout,
    }

// @ts-ignore
document = !isMobile()
  ? document
  : {
      activeElement: {
        classList: {
          contains: (str: string) => true,
        },
      },
      getElementsByClassName: (str: string) => {},
    }

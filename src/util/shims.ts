/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable no-global-assign */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-native-reassign */
import { isMobile } from './isMobile'

// @ts-ignore
// window = !isMobile()
//   ? window
//   : {
//       // getSelection: () => ({
//       //   focusOffset: 0,
//       // }),
//       // setTimeout: setTimeout,
//     }

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

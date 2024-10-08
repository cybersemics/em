import _ from 'lodash'
import Shortcut from '../@types/Shortcut'


/**********************************************************************
 * Helper Functions
 **********************************************************************/

export const sortShortcuts = (
  possibleShortcuts: Shortcut[],
  keyboardInProgress: string,
  store: any,
) => {

  return _.sortBy(possibleShortcuts, shortcut => {
    const label = (
      shortcut.labelInverse && shortcut.isActive?.(store.getState) ? shortcut.labelInverse : shortcut.label
    ).toLowerCase()

    // always sort exact match to top
    if (keyboardInProgress.trim().toLowerCase() === label) return '\x00'

    return (
      // prepend \x01 to sort after exact match and before inactive shortcuts
      '\x01' +
      [
        // startsWith
        keyboardInProgress && label.startsWith(keyboardInProgress.trim().toLowerCase()) ? 0 : 1,
        // contains (n chars)
        // subtract from a large value to reverse order, otherwise shortcuts with fewer matches will be sorted to the top
        keyboardInProgress &&
          (
            9999 -
            keyboardInProgress
              .toLowerCase()
              .split('')
              .filter(char => char !== ' ' && label.includes(char)).length
          )
            .toString()
            .padStart(5, '0'),
        // all else equal, sort by label
        label,
      ].join('\x00')
    )
  })
}

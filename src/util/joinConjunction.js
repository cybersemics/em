/** Join a list of strings with "," and insert the given conjunction (default: 'and') before the last string. */
export const joinConjunction = (arr, conjunction = 'and') =>
  arr.length === 0 ? ''
    : arr.length === 1 ? arr[0]
      : arr.slice(0, arr.length - 1).join(', ') + (arr.length === 2 ? '' : ',') + ` ${conjunction} ` + arr[arr.length - 1]

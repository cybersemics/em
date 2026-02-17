import GestureString from '../@types/GestureString'

enum gestureEnum {
  newSubThought = 'rdr',
  newThought = 'rd',
  bumpThoughtDown = 'rld',
}

const gestures = gestureEnum as {
  [key in keyof typeof gestureEnum]: GestureString
}

// widen the type of the gestureEnum values to GestureString using a mapped type
// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
export default gestures

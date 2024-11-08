import GesturePath from '../@types/GesturePath'

enum gestureEnum {
  newSubThought = 'rdr',
  newThought = 'rd',
  bumpThoughtDown = 'rld',
}

const gestures = gestureEnum as {
  [key in keyof typeof gestureEnum]: GesturePath
}

// widen the type of the gestureEnum values to GesturePath using a mapped type
// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
export default gestures

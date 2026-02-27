import Gesture from '../@types/Gesture'

enum gestureEnum {
  newSubThought = 'rdr',
  newThought = 'rd',
  bumpThoughtDown = 'rld',
}

const gestures = gestureEnum as {
  [key in keyof typeof gestureEnum]: Gesture
}

// widen the type of the gestureEnum values to Gesture using a mapped type
// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
export default gestures

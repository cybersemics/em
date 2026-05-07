/** Test thoughts in a readable way by comparing their values in order. */
const expectThoughtValuesInOrder = (thoughts: { value: string }[], values: string[]) => {
  expect(thoughts.map(thought => thought.value)).toEqual(values)
}

export default expectThoughtValuesInOrder

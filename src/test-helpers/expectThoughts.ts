/** Checks the values of sibling thoughts already returned in canonical order. */
const expectThoughts = (thoughts: { value: string }[], values: string[]) => {
  expect(thoughts.map(thought => thought.value)).toEqual(values)
}

export default expectThoughts

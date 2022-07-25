/** Ranks the thoughts from 0 to n in the given array order. */
export const rankThoughtsSequential = (thoughts: string[]) => thoughts.map((value, i) => ({ value, rank: i }))

// @MIGRATION_TODO: Probably gonna change how this is implemented.
it.skip('single chain', () => {
  //   expect(
  //     chain(
  //       initialState(),
  //       [
  //         [
  //           { value: 'a', id: 'a', rank: 0 },
  //           { value: 'b', id: 'b', rank: 0 },
  //         ] as Path as SimplePath,
  //       ],
  //       [
  //         { value: 'a', id: 'a', rank: 0 },
  //         { value: 'b', id: 'b', rank: 0 },
  //         { value: 'c', id: 'c', rank: 0 },
  //       ] as Path as SimplePath,
  //     ),
  //   ).toEqual([
  //     { value: 'a', id: 'a', rank: 0 },
  //     { value: 'b', id: 'b', rank: 0 },
  //     { value: 'a', id: 'a', rank: 0 },
  //     { value: 'c', id: 'c', rank: 0 },
  //   ])
  // })
  // it.skip('multiple chains', () => {
  //   expect(
  //     pathToContext(
  //       chain(
  //         initialState(),
  //         [rankThoughtsSequential(['2', 'A']) as SimplePath, rankThoughtsSequential(['1', 'A', 'Nope']) as SimplePath],
  //         rankThoughtsSequential(['START', 'B', 'Nope', 'Butter', 'Bread']) as SimplePath,
  //       ),
  //     ),
  //   ).toEqual(['2', 'A', '1', 'Nope', 'B', 'Butter', 'Bread'])
  // })
  // it.skip('match pivot value in plural form', () => {
  //   expect(
  //     pathToContext(
  //       chain(
  //         initialState(),
  //         [rankThoughtsSequential(['a', 'cats']) as SimplePath],
  //         rankThoughtsSequential(['b', 'cat']) as SimplePath,
  //       ),
  //     ),
  //   ).toEqual(['a', 'cats', 'b'])
})

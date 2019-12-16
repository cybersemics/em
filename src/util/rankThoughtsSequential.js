/** Ranks the thoughts from 0 to n. */
export const rankThoughtsSequential = thoughts =>
  thoughts.map((thought, i) => ({ value: thought, rank: i }))

/** Ranks the thoughts from 0 to n. */
export const rankThoughtsSequential = thoughts =>
  thoughts.map((thought, i) => ({ key: thought, rank: i }))

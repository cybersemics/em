/** Returns the difference in seconds between two timestamps (milliseconds) */
export const timeDifference = (timestamp1, timestamp2) =>
  Math.floor((new Date(timestamp1).getTime() - new Date(timestamp2).getTime()) / 1000)

export const dateDifference = (timestamp1, timestamp2) => {
  return Math.floor((new Date(timestamp1).getTime() - new Date(timestamp2).getTime()) / 1000 / 60)
}

/** Compare ranks between two thoughts. */
const compareRanks = (rankA: number, rankB: number) => {
  const partsA = String(rankA).split('.').map(Number)
  const partsB = String(rankB).split('.').map(Number)
  const len = Math.max(partsA.length, partsB.length)

  let result = 0
  const indexArray = Array.from({ length: len }, (_, i) => i)

  indexArray.some(i => {
    const valA = partsA[i] || 0
    const valB = partsB[i] || 0
    if (valA !== valB) {
      result = valA - valB
      return true
    }
    return false
  })

  return result
}

export default compareRanks

/** returns array of recently edited data sorted by lastUpdated field */
export const sortByLastUpdated = (recentlyEditedArray) => {
  return recentlyEditedArray.sort((data1, data2) => {
    const time1 = parseInt(new Date(data1.lastUpdated).getTime())
    const time2 = parseInt(new Date(data2.lastUpdated).getTime())
    return time2 - time1
  })
}
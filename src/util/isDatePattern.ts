/** 
 * Checks if a string matches a date pattern like "M/d" or "M-d"
 * Accepts 1-2 digits for month and day, separated by "/" or "-"
 * Examples: "6/21", "6-21", "12/1", "12-1"
 */
const isDatePattern = (value: string): boolean => {
  // Match patterns like "6/21", "6-21", "12/1", "12-1"
  const dateRegex = /^\d{1,2}[\/\-]\d{1,2}$/
  return dateRegex.test(value.trim())
}

export default isDatePattern 
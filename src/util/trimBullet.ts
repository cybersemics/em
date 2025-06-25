/** Trims the leading "- " from single line text. Returns multiline text as-is.*/
const trimBullet = (s: string): string => (s.includes('\n') ? s : s.replace(/^- /, ''))

export default trimBullet

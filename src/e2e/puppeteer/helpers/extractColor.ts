/** Extract the color and background color from an HTML string. */
const extractColor = (
  html: string,
): {
  color: string | null
  backgroundColor: string | null
} => {
  const colorMatch = html.match(/color=['"]?(#[0-9a-fA-F]{6}|[a-zA-Z]+)['"]?/)
  const backgroundColorMatch = html.match(/background-color:\s*([^;]+)/)

  const color = colorMatch ? colorMatch[1] : null
  const backgroundColor = backgroundColorMatch ? backgroundColorMatch[1].trim() : null
  return { color, backgroundColor }
}

export default extractColor

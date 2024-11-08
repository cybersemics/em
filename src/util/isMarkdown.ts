/** Returns true if the given text is presumed to be markdown by checking for markdown-specific tokens. */
export default function isMarkdown(text: string): boolean {
  // Regular expressions for common Markdown elements
  const headingRegex = /^ *#{1,6}/m
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/
  const imageRegex = /!\[([^\]]+)\]\(([^)]+)\)/

  // Check for the presence of headings, links, or images
  return headingRegex.test(text) || linkRegex.test(text) || imageRegex.test(text)
}

/**
 * Strip html string.
 * The main purpose of this function to get cleaned text from the given html string to simulate paste event with type 'text/plain'.
 */
const stripHTML = (html: string) => {
  // Remove whitespaces between tags, and replace <br> with \n
  const clean = html
    .replace(/[\t ]+</g, '<')
    .replace(/>[\t ]+</g, '><')
    .replace(/>[\t ]+$/g, '>')
    .replace(/<br>/g, '\n')

  const doc = new DOMParser().parseFromString(clean, 'text/html')
  return doc.body.textContent || ''
}

export default stripHTML

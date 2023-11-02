const REGEX_PUNCTUATION = /[;:.?!\-—,'"]/gi

/** Strips all punctuation from the given string. */
const stripPunctuation = (text: string) => text.replace(REGEX_PUNCTUATION, '')

export default stripPunctuation

/* Proof:

let invalidChars = []
for(let i = 0; i < 256; i++) {
  let char = String.fromCharCode(i);
    let error
    try {
      let query = document.querySelector('_' + char)
    }
    catch (e) {
      error = e
    }
    if (error) {
      invalidChars.push(char)
    }
}

*/

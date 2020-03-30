const regexAllTags = /<(?:.|\n)*?>/gmi
const regexPreserveFormattingTags = /<(?!\/?[biu](?: (?:.|\n)*)?>)(?:.|\n)*?>/gmi
const regexTagAndAttributes = /<(?![/])(?:(\w*)((?:.|\n)*?))\/?>/gmi
const regexNbsp = /&nbsp;/gmi

/** Strip HTML tags, convert nbsp to normal spaces, and trim. */
export const strip = (html, { preserveFormatting } = {}) => html
  .replace(preserveFormatting ? regexPreserveFormattingTags : regexAllTags, '')
  // second pass to replace formatting tag attributes e.g. <b style="...">
  .replace(regexTagAndAttributes, '<$1>')
  .replace(regexNbsp, ' ')
  .trim()

// assert.strictEqual(strip('a<br/>', { preserveFormatting: true }), 'a')
// assert.strictEqual(strip('a<br   />', { preserveFormatting: true }), 'a')
// assert.strictEqual(strip('<span>b</span>five', { preserveFormatting: true }), 'bfive')
// assert.strictEqual(strip('<span style="color: blue">b</span>five', { preserveFormatting: true }), 'bfive')
// assert.strictEqual(strip('<li>b</li>five', { preserveFormatting: true }), 'bfive')
// assert.strictEqual(strip(`<l
//   >b</li>five`, { preserveFormatting: true }), 'bfive')
// assert.strictEqual(strip('Hello <bike>red</bike> world!', { preserveFormatting: true }), 'Hello red world!')
// assert.strictEqual(strip('Hello <b>world</b>', { preserveFormatting: true }), 'Hello <b>world</b>')
// assert.strictEqual(strip('Hello <i>sun</i>', { preserveFormatting: true }), 'Hello <i>sun</i>')
// assert.strictEqual(strip('Hello <u>sky</u>', { preserveFormatting: true }), 'Hello <u>sky</u>')
// assert.strictEqual(strip('Hello <b m>red</b> world!', { preserveFormatting: true }), 'Hello <b>red</b> world!')
// assert.strictEqual(strip('Hello <b style="color: red">red</b> world!', { preserveFormatting: true }), 'Hello <b>red</b> world!')

// This fails here, but succeeds on regex101.com (???)
// assert.strictEqual(strip(`Hello <b
//   style="color: red">red</b> world!`, { preserveFormatting: true }), 'Hello <b>red</b> world!')

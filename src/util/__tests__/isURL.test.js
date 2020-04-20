import { isURL } from '../isURL'

const goodUrlList = [
  'http://nonssl.com',
  'https://ssl.com',
  'localhost:3000/',
  'localhost:3000',
  'nohttp.com',
  'withslash.com/',
  'sub.domain.com',
  'withpath.com/a/b',
  'http://foo.com/blah_blah',
  'http://foo.com/blah_blah/',
  'http://foo.com/blah_blah_(wikipedia)',
  'http://foo.com/blah_blah_(wikipedia)_(again)',
  'http://www.example.com/wpstyle/?p=364',
  'https://www.example.com/foo/?bar=baz&inga=42&quux',
  'http://userid:password@example.com:8080',
  'http://userid:password@example.com:8080/',
  'http://userid@example.com',
  'http://userid@example.com/',
  'http://userid@example.com:8080',
  'http://userid@example.com:8080/',
  'http://userid:password@example.com',
  'http://userid:password@example.com/',
  'http://foo.com/blah_(wikipedia)#cite-1',
  'http://foo.com/blah_(wikipedia)_blah#cite-1',
  'http://foo.com/(something)?after=parens',
  'http://code.google.com/events/#&product=browser',
  'http://a.b-c.de',
]

const badUrlList = [
  'e.g.',
  '3.5/5',
  'http://',
  'http://.',
  'http://..',
  'http://../',
  'http://?',
  'http://??',
  'http://??/',
  'http://#',
  'http://##',
  'http://##/',
  'http://foo.bar?q=Spaces should be encoded',
  '//',
  '//a',
  '///a',
  '///',
  'http:///a',
  'rdar://1234',
  'h://test',
  'http:// shouldfail.com',
  ':// should fail',
  'http://foo.bar/foo(bar)baz quux',
  'ftps://foo.bar/',
  'http://-error-.invalid/',
  'http://-a.b.co',
  'http://a.b-.co',
  'http://3628126748',
  'http://.www.foo.bar/',
  'http://www.foo.bar./',
  'http://.www.foo.bar./'
]

goodUrlList.forEach(url => {
  describe(`isURL for ${url}`, () => {
    it('should pass', () => {
      expect(isURL(url)).toBe(true)
    })
  })
})

badUrlList.forEach(url => {
  describe(`isURL for ${url}`, () => {
    it('should fail', () => {
      expect(isURL(url)).toBe(false)
    })
  })
})

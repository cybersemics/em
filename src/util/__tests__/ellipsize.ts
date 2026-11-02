import ellipsize from '../../util/ellipsize'

it('ellipsize', () => {
  expect(ellipsize('Lorem Ipsum is simply dummy text')).toEqual('Lorem Ipsum is...')
  expect(ellipsize('Lorem Ipsum is')).toEqual('Lorem Ipsum is')
  expect(ellipsize('Lorem Ipsum is simply dummy text', 8)).toEqual('Lorem ...')
})

it('decodes character entities', () => {
  expect(ellipsize('Lorem Ipsum &gt; Lipsum dummy text')).toEqual('Lorem Ipsum > ...')
  expect(ellipsize('One &lt; Two &gt; Zero dummy text')).toEqual('One < Two > Ze...')
  expect(ellipsize('&lt;aaa&gt;')).toEqual('<aaa>')
  expect(ellipsize('&lt;foo&gt;&lt;/foo&gt;')).toEqual('<foo></foo>')
  expect(ellipsize('Tom &amp; Jerry')).toEqual('Tom & Jerry')
})

it('strips formatting tags', () => {
  expect(ellipsize('Lorem Ipsum <span>is</span>')).toEqual('Lorem Ipsum is')
  expect(ellipsize('<b>Lorem</b>Ipsum is simply ')).toEqual('LoremIpsum is ...')
  expect(ellipsize('<b>Lorem Ipsum <i>is</i> simply</b> dummy text')).toEqual('Lorem Ipsum is...')
  expect(ellipsize('<font color="#ff573d"><b>aaa</b></font>')).toEqual('aaa')
})

it('does not split surrogate pairs', () => {
  expect(ellipsize('😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀', 5)).toEqual('😀😀😀...')
})

it('returns an empty string for an empty value', () => {
  expect(ellipsize('')).toEqual('')
  expect(ellipsize(undefined)).toEqual('')
})

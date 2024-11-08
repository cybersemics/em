import ellipsize from '../../util/ellipsize'

it('ellipsize', () => {
  expect(ellipsize('Lorem Ipsum is simply dummy text')).toEqual('Lorem Ipsum is...')
  expect(ellipsize('Lorem Ipsum > Lipsum dummy text')).toEqual('Lorem Ipsum > ...')
  expect(ellipsize('One < Two > Zero dummy text')).toEqual('One < Two > Ze...')
  expect(ellipsize('Lorem Ipsum <span>is</span>')).toEqual('Lorem Ipsum <span>is</span>')
  expect(ellipsize('<b>Lorem</b>Ipsum is simply ')).toEqual('<b>Lorem</b>Ipsum is ...')
  expect(ellipsize('<b>Lorem Ipsum is simply</b> dummy text')).toEqual('<b>Lorem Ipsum is...</b>')
  expect(ellipsize('<b>Lorem Ipsum <i>is</i> simply</b> dummy text')).toEqual('<b>Lorem Ipsum <i>is...</i></b>')
})

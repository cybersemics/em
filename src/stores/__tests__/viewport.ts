import viewportStore, { updateSize } from '../viewport'

it('recalculates the scroll zone width when the viewport changes', () => {
  window.innerWidth = 400
  window.innerHeight = 800

  updateSize()

  // a quarter of the smaller dimension
  expect(viewportStore.getState().scrollZoneWidth).toBe(100)
})

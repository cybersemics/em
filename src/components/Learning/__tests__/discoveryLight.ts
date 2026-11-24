import discoveryLight, { drawLight, lampsAt } from '../discoveryLight'
import discoveryTimeline from '../discoveryTimeline'

const WIDTH = 24
const HEIGHT = 53

/** The light at a moment, as the brightness of each row down the screen, averaged across it. */
const rows = (time: number) => {
  const pixels = new Uint8ClampedArray(WIDTH * HEIGHT * 4)
  drawLight(pixels, WIDTH, HEIGHT, time, () => 0.5)
  return Array.from({ length: HEIGHT }, (_, row) => {
    let sum = 0
    for (let column = 0; column < WIDTH; column++) {
      const i = (row * WIDTH + column) * 4
      sum += pixels[i] + pixels[i + 1] + pixels[i + 2]
    }
    return sum / WIDTH
  })
}

/** The row the light is brightest on. */
const brightestRow = (time: number) => {
  const brightness = rows(time)
  return brightness.indexOf(Math.max(...brightness))
}

it('the key lamp is lowered with the command, starting and landing with it', () => {
  const { key } = discoveryLight

  expect(lampsAt(0)[0].y).toBe(key.yHold)
  expect(lampsAt(discoveryTimeline.fogDescends.end)[0].y).toBe(key.yPool)
  expect(lampsAt(discoveryTimeline.fogDescends.end / 2)[0].y).toBeGreaterThan(key.yHold)
})

it('the light is brightest at the top while the user holds, and lower once the command has landed', () => {
  expect(brightestRow(0)).toBeLessThan(HEIGHT * 0.15)
  expect(brightestRow(discoveryTimeline.fogDescends.end)).toBeGreaterThan(HEIGHT * 0.3)
})

it('the light has no edge: it reaches every row of the screen, however dimly', () => {
  rows(discoveryTimeline.fogDescends.end).forEach(brightness => expect(brightness).toBeGreaterThan(0))
})

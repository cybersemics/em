import path from 'path'
import Modal from '../../../@types/Modal'
import configureSnapshots from '../configureSnapshots'
import openModal from '../helpers/openModal'
import screenshot from '../helpers/screenshot'
import setTheme from '../helpers/setTheme'

const testFileName = path.basename(__filename).replace('.ts', '')
expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: testFileName }),
})

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

/** Returns snapshot images for light and dark themes for modal. */
const modalSnapshots = async (id: Modal) => {
  await openModal(id)
  const darkImage = await screenshot({ hardwareAcceleration: false })

  await setTheme('Light')
  await openModal(id)

  const lightImage = await screenshot({ hardwareAcceleration: false })

  await setTheme('Dark')
  return {
    dark: darkImage,
    light: lightImage,
  }
}

it('modal', async () => {
  const customizeToolbarImages = await modalSnapshots('customizeToolbar')
  expect(customizeToolbarImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-customizeToolbar` })
  expect(customizeToolbarImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-customizeToolbar-light',
  })

  const devicesImages = await modalSnapshots('devices')
  expect(devicesImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-devices` })
  expect(devicesImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-devices-light',
  })

  const exportImages = await modalSnapshots('export')
  expect(exportImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-export` })
  expect(exportImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-export-light',
  })

  const helpImages = await modalSnapshots('help')
  expect(helpImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-help` })
  expect(helpImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-help-light',
  })

  const settingsImages = await modalSnapshots('settings')
  expect(settingsImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-settings` })
  expect(settingsImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-settings-light',
  })

  const welcomeImages = await modalSnapshots('welcome')
  expect(welcomeImages.dark).toMatchImageSnapshot({ customSnapshotIdentifier: `modal-welcome` })
  expect(welcomeImages.light).toMatchImageSnapshot({
    customSnapshotIdentifier: 'modal-welcome-light',
  })
})

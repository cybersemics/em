import Command from '../@types/Command'

const cancelShortcut: Command = {
  id: 'cancel',
  label: 'Cancel',
  description: 'Cancel the current gesture.',
  gesture: undefined,
  keyboard: { key: ',', meta: true },
  multicursor: 'ignore',
  svg: () => null,
  exec: dispatch => {
    alert('cancel')
  },
  allowExecuteFromModal: true,
}

export default cancelShortcut

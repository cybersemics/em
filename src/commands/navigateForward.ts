import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import ArrowRightIcon from '../components/icons/ArrowRightIcon'

const navigateForwardCommand: Command = {
  id: 'navigateForward',
  label: 'Navigate Forward',
  description: 'Navigate to the next page in the browser history.',
  keyboard: [
    { key: ']', meta: true },
    { key: Key.ArrowRight, meta: true },
  ],
  multicursor: false,
  svg: ArrowRightIcon,
  canExecute: () => !!window.navigation?.canGoForward,
  exec: () => window.navigation?.forward(),
}

export default navigateForwardCommand

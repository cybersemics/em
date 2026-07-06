import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon'

const navigateBackCommand: Command = {
  id: 'navigateBack',
  label: 'Navigate Back',
  description: 'Navigate to the previous page in the browser history.',
  keyboard: [
    { key: '[', meta: true },
    { key: Key.ArrowLeft, meta: true },
  ],
  multicursor: false,
  svg: ArrowLeftIcon,
  canExecute: () => !!window.navigation?.canGoBack,
  exec: () => window.navigation?.back(),
}

export default navigateBackCommand

import Command from '../@types/Command'
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon'

const navigateBackCommand: Command = {
  id: 'navigateBack',
  label: 'Navigate Back',
  description: 'Navigate to the previous page in the browser history.',
  keyboard: { key: '[', meta: true },
  multicursor: false,
  svg: ArrowLeftIcon,
  // Prefer the Navigation API's canGoBack when available; otherwise fall back to the history length as a rough approximation of whether there is anywhere to go back to.
  canExecute: () => (window.navigation ? window.navigation.canGoBack : window.history.length > 1),
  exec: () => (window.navigation ? window.navigation.back() : window.history.back()),
}

export default navigateBackCommand

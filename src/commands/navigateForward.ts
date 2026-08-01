import Command from '../@types/Command'
import ArrowRightIcon from '../components/icons/ArrowRightIcon'

const navigateForwardCommand: Command = {
  id: 'navigateForward',
  label: 'Navigate Forward',
  description: 'Navigate to the next page in the browser history.',
  keyboard: { key: ']', meta: true },
  multicursor: false,
  svg: ArrowRightIcon,
  // Prefer the Navigation API's canGoForward when available; otherwise fall back to the history length as a rough approximation of whether there is anywhere to go forward to.
  canExecute: () => (window.navigation ? window.navigation.canGoForward : window.history.length > 1),
  exec: () => (window.navigation ? window.navigation.forward() : window.history.forward()),
}

export default navigateForwardCommand

import Command from '../@types/Command'
import ArrowRightIcon from '../components/icons/ArrowRightIcon'

const navigateForwardCommand = {
  id: 'navigateForward',
  label: 'Navigate Forward' as const,
  description: 'Navigate to the next page in the browser history.',
  keyboard: { key: ']', meta: true },
  multicursor: false,
  svg: ArrowRightIcon,
  // The Navigation API is unsupported in some browsers (e.g. older Safari), where window.navigation is undefined at runtime even though the DOM lib types it as always present. Prefer its canGoForward when available; otherwise fall back to the history length as a rough approximation of whether there is anywhere to go forward to.
  canExecute: () => (window.navigation ? window.navigation.canGoForward : window.history.length > 1),
  // void discards the NavigationResult returned by Navigation.forward, which Command.exec does not accept.
  exec: () => void (window.navigation ? window.navigation.forward() : window.history.forward()),
} satisfies Command

export default navigateForwardCommand

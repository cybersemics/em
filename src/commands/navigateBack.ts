import Command from '../@types/Command'
import ArrowLeftIcon from '../components/icons/ArrowLeftIcon'

const navigateBackCommand = {
  id: 'navigateBack',
  label: 'Navigate Back' as const,
  description: 'Navigate to the previous page in the browser history.',
  keyboard: { key: '[', meta: true },
  multicursor: false,
  svg: ArrowLeftIcon,
  // The Navigation API is unsupported in some browsers (e.g. older Safari), where window.navigation is undefined at runtime even though the DOM lib types it as always present. Prefer its canGoBack when available; otherwise fall back to the history length as a rough approximation of whether there is anywhere to go back to.
  canExecute: () => (window.navigation ? window.navigation.canGoBack : window.history.length > 1),
  // void discards the NavigationResult returned by Navigation.back, which Command.exec does not accept.
  exec: () => void (window.navigation ? window.navigation.back() : window.history.back()),
} satisfies Command

export default navigateBackCommand

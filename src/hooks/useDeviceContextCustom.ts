import { useWindowDimensions } from 'react-native'
import { useSelector } from 'react-redux'
import { TailwindFn } from 'twrnc'
import { RnColorScheme } from 'twrnc/dist/types'
import { State } from '../@types'
import { theme } from '../selectors'
/**
 * Hook to re-render and enable device context prefixes for tw.
 */
export function useDeviceContextCustom(tw: TailwindFn): void {
  const themeMode = useSelector((state: State) => theme(state))

  const themeModeToRNColorScheme = themeMode.toLowerCase() as RnColorScheme

  const window = useWindowDimensions()
  tw.setWindowDimensions(window)
  tw.setFontScale(window.fontScale)
  tw.setPixelDensity(window.scale === 1 ? 1 : 2)
  tw.setColorScheme(themeModeToRNColorScheme)
}

import React, { createContext, FC, useContext, useState } from 'react'
import { ThemeProvider as StyledThemeProvider, useTheme } from 'styled-components/native'
type ColorMode = 'light' | 'dark'

export type ThemeSetters = {
  setMode: (mode: ColorMode) => void
  setFontScale: (scale: number) => void
}

export type Theme = {
  mode: ColorMode
  fontScale: number
}

const ThemeSetterContext = createContext<ThemeSetters>({} as any)

/**
 * Global Theme Provider.
 */
const ThemeProvider: FC = ({ children }) => {
  const [mode, setMode] = useState<ColorMode>('light')
  const [fontScale, setFontScale] = useState<number>(1)

  return (
    <ThemeSetterContext.Provider
      value={{
        setMode,
        setFontScale,
      }}
    >
      <StyledThemeProvider
        theme={{
          mode,
          fontScale,
        }}
      >
        {children}
      </StyledThemeProvider>
    </ThemeSetterContext.Provider>
  )
}

/**
 * Hook to set theme mode.
 */
export const useToggleThemeMode = () => {
  const { mode } = useTheme() as Theme
  const setMode = useContext(ThemeSetterContext).setMode
  return () => setMode(mode === 'dark' ? 'light' : 'dark')
}

export default ThemeProvider

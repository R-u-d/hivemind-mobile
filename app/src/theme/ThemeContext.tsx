import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { colors, darkColors, type Colors } from '@/theme';

const ThemeContext = createContext<Colors>(colors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = scheme === 'dark' ? darkColors : colors;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useIsDark() {
  return useColorScheme() === 'dark';
}

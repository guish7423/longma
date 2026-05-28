import { createContext, useContext, type ReactNode } from 'react';
import { tokens, type Token } from './tokens';

const ThemeContext = createContext<Token>(tokens);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Token {
  return useContext(ThemeContext);
}

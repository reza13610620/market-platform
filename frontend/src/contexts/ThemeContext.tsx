import React, { createContext, useContext, useEffect, useState } from 'react'

export type GenderTheme = 'female' | 'male' | 'neutral'

interface ThemeContextType {
  theme: GenderTheme
  setTheme: (theme: GenderTheme) => void
  primaryColor: string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<GenderTheme>(() => {
    const saved = localStorage.getItem('gender-theme')
    return (saved as GenderTheme) || 'neutral'
  })

  const setTheme = (newTheme: GenderTheme) => {
    setThemeState(newTheme)
    localStorage.setItem('gender-theme', newTheme)
  }

  // Apply CSS variables based on theme
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'female') {
      root.style.setProperty('--color-primary', '#ec4899')       // pink-500
      root.style.setProperty('--color-primary-hover', '#db2777') // pink-600
      root.style.setProperty('--color-primary-light', '#fce7f3') // pink-100
      root.style.setProperty('--color-primary-soft', '#fdf2f8')  // pink-50
    } else if (theme === 'male') {
      root.style.setProperty('--color-primary', '#3b82f6')       // blue-500
      root.style.setProperty('--color-primary-hover', '#2563eb') // blue-600
      root.style.setProperty('--color-primary-light', '#dbeafe') // blue-100
      root.style.setProperty('--color-primary-soft', '#eff6ff')  // blue-50
    } else {
      // Neutral calm green-blue
      root.style.setProperty('--color-primary', '#0d9488')       // teal-600
      root.style.setProperty('--color-primary-hover', '#0f766e') // teal-700
      root.style.setProperty('--color-primary-light', '#ccfbf1') // teal-100
      root.style.setProperty('--color-primary-soft', '#f0fdfa')  // teal-50
    }
  }, [theme])

  const primaryColor = theme === 'female' ? 'female' : theme === 'male' ? 'male' : 'teal'

  return (
    <ThemeContext.Provider value={{ theme, setTheme, primaryColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'sc-theme'

/**
 * Reads the user's theme preference from localStorage, applies the `dark`
 * class to <html>, and persists any toggle. A no-flash inline script in
 * index.html applies the class before React mounts so there's no flicker.
 */
export function useTheme() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
    } catch { /* sandboxed environment — ignore */ }
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}

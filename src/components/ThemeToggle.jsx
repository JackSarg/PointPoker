import { Moon, Sun } from 'lucide-react'

export default function ThemeToggle({ theme, onThemeChange }) {
  return (
    <div className={`theme-toggle ${theme === 'light' ? 'is-light' : 'is-dark'}`} role="group" aria-label="Colour theme">
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <button type="button" aria-label="Use light mode" aria-pressed={theme === 'light'} onClick={() => onThemeChange('light')}><Sun size={14} /></button>
      <button type="button" aria-label="Use dark mode" aria-pressed={theme === 'dark'} onClick={() => onThemeChange('dark')}><Moon size={14} /></button>
    </div>
  )
}

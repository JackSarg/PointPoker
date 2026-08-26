import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './interaction-enhancements.css'

let initialTheme = 'dark'
try {
  const storedTheme = localStorage.getItem('pointpoker:theme') || localStorage.getItem('pointdeck-theme')
  initialTheme = storedTheme === 'light' ? 'light' : 'dark'
} catch {
  // Dark mode remains the safe default when storage is unavailable.
}
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { useEffect, useState } from 'react'
import Landing from './components/Landing'
import CreateRoom from './components/CreateRoom'
import JoinRoom from './components/JoinRoom'
import GameRoom from './components/GameRoom'
import LegalPage from './components/LegalPage'
import { getSession } from './lib'

function currentRoute() {
  const match = window.location.pathname.match(/^\/room\/([A-Za-z0-9]+)\/?$/)
  if (match) return { page: 'room', code: match[1].toUpperCase() }
  if (/^\/create\/?$/.test(window.location.pathname) || /^#create\/?$/.test(window.location.hash)) return { page: 'create' }
  if (/^\/privacy\/?$/.test(window.location.pathname)) return { page: 'privacy' }
  if (/^\/terms\/?$/.test(window.location.pathname)) return { page: 'terms' }
  return { page: 'home' }
}

export default function App() {
  const [route, setRoute] = useState(currentRoute)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => {
    const update = () => setRoute(currentRoute())
    window.addEventListener('popstate', update)
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('pointpoker:theme', theme)
    } catch {
      // The selected theme still applies for this visit when storage is unavailable.
    }
  }, [theme])

  const navigate = (path) => {
    window.history.pushState({}, '', path)
    setRoute(currentRoute())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (route.page === 'room') {
    const session = getSession(route.code)
    return session
      ? <GameRoom code={route.code} session={session} onLeave={() => navigate('/')} theme={theme} onThemeChange={setTheme} />
      : <JoinRoom code={route.code} onJoined={() => setRoute({ ...route })} onBack={() => navigate('/')} theme={theme} onThemeChange={setTheme} />
  }

  if (route.page === 'create') {
    return <CreateRoom onNavigate={navigate} onBack={() => navigate('/')} theme={theme} onThemeChange={setTheme} />
  }

  if (route.page === 'privacy' || route.page === 'terms') {
    return <LegalPage kind={route.page} onNavigate={navigate} theme={theme} onThemeChange={setTheme} />
  }

  return <Landing onNavigate={navigate} theme={theme} onThemeChange={setTheme} />
}

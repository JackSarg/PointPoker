import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, LockKeyhole, Users } from 'lucide-react'
import AvatarPicker from './AvatarPicker'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { api, saveSession } from '../lib'

export default function JoinRoom({ code, onJoined, onBack, theme, onThemeChange }) {
  const [meta, setMeta] = useState(null)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🐼')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    api(`/api/rooms/${code}`).then((data) => active && setMeta(data)).catch((requestError) => active && setError(requestError.message))
    return () => { active = false }
  }, [code])

  const join = async (event) => {
    event.preventDefault()
    if (!nickname.trim()) return setError('Choose a nickname to take your seat.')
    setBusy(true)
    setError('')
    try {
      const data = await api(`/api/rooms/${code}/join`, {
        method: 'POST', body: JSON.stringify({ nickname, avatar }),
      })
      saveSession(code, { playerId: data.playerId, token: data.token })
      onJoined()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  if (!meta && !error) return <div className="full-loader"><Logo /><LoaderCircle className="spin" /><p>Finding your table…</p></div>

  return (
    <main className="join-page">
      <div className="join-glow" />
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back home</button>
      <div className="join-theme-control"><ThemeToggle theme={theme} onThemeChange={onThemeChange} /></div>
      <div className="join-panel">
        <Logo />
        {meta ? (
          <>
            <div className="invite-summary">
              <div className="invite-avatars">{meta.avatars.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div>
              <span className="invite-kicker">You’ve been invited to</span>
              <h1>{meta.name}</h1>
              <p><Users size={15} /> {meta.participantCount} {meta.participantCount === 1 ? 'player is' : 'players are'} already at the table</p>
            </div>
            <form className="join-details" onSubmit={join}>
              <label className="field-label">Your nickname<input autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="How should we know you?" maxLength={28} /></label>
              <AvatarPicker value={avatar} onChange={setAvatar} label="Pick your character" />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button primary full" disabled={busy}>
                {busy ? <><LoaderCircle className="spin" size={18} /> Taking your seat…</> : <>Take my seat <ArrowRight size={18} /></>}
              </button>
              <p className="form-foot"><LockKeyhole size={13} /> Your vote stays hidden until the reveal.</p>
              <p className="collection-notice">A private room access key is saved in this browser. <a href="/privacy">Privacy</a></p>
            </form>
          </>
        ) : (
          <div className="missing-room"><span>404</span><h1>That table has packed up.</h1><p>{error}</p><button className="button light" onClick={onBack}>Create a new room</button></div>
        )}
      </div>
    </main>
  )
}

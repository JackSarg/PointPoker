import { useState } from 'react'
import { ArrowRight, BarChart3, CheckCircle2, Coffee, Globe2, LoaderCircle, Play, Sparkles } from 'lucide-react'
import AvatarPicker from './AvatarPicker'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { api, roomPath, saveSession } from '../lib'

function GithubIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 .7A11.5 11.5 0 0 0 8.36 23c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.36-3.9-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.39.97.1-.75.4-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" /></svg>
}

function LinkedinIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5.34 3.6a2.26 2.26 0 1 1 0 4.52 2.26 2.26 0 0 1 0-4.52ZM3.39 9.8h3.9v10.6h-3.9V9.8Zm6.23 0h3.74v1.45h.05c.52-.99 1.8-2.03 3.7-2.03 3.96 0 4.69 2.61 4.69 6v5.18h-3.9v-4.59c0-1.1-.02-2.5-1.52-2.5-1.53 0-1.76 1.19-1.76 2.42v4.67h-3.9V9.8Z" /></svg>
}

export default function Landing({ onNavigate, theme, onThemeChange }) {
  const [joinCode, setJoinCode] = useState('')
  const [createForm, setCreateForm] = useState({ roomName: '', nickname: '', avatar: '🦊' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const joinRoom = (event) => {
    event.preventDefault()
    const code = joinCode.trim().replace(/[^a-z0-9]/gi, '').toUpperCase()
    if (code) onNavigate(roomPath(code))
  }

  const updateCreateForm = (field, value) => setCreateForm((current) => ({ ...current, [field]: value }))

  const createRoom = async (event) => {
    event.preventDefault()
    setCreateError('')
    if (!createForm.roomName.trim() || !createForm.nickname.trim()) {
      setCreateError('Give your room and yourself a name first.')
      return
    }

    setCreating(true)
    try {
      const data = await api('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.roomName,
          nickname: createForm.nickname,
          avatar: createForm.avatar,
          detailsEnabled: false,
        }),
      })
      saveSession(data.code, { playerId: data.playerId, token: data.token })
      onNavigate(roomPath(data.code))
    } catch (requestError) {
      setCreateError(requestError.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="landing-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <nav className="landing-nav">
        <Logo />
        <div className="nav-actions">
          <span className="nav-note"><span className="live-dot" /> Free to play</span>
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
          <button className="button ghost small" type="button" onClick={() => onNavigate('/create')}>Start a room</button>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> Refinement without the drag</div>
          <h1>Turn fuzzy stories into <em>clear decisions.</em></h1>
          <p className="hero-lead">
            A fast, focused planning poker room that gets everyone thinking independently - then talking about what matters.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#quick-create">Create a room <ArrowRight size={17} /></a>
            <a className="text-link" href="#how"><Play size={15} fill="currentColor" /> See how it works</a>
          </div>
          <div className="trust-row">
            <div className="avatar-stack" aria-hidden="true">
              {['\u{1F98A}', '\u{1F43C}', '\u{1F438}', '\u{1F42F}'].map((item) => <span key={item}>{item}</span>)}
            </div>
            <p><strong>No accounts. No setup.</strong><br />Share a link and start pointing.</p>
          </div>
        </div>

        <div className="hero-visual" aria-label="Preview of a planning poker table">
          <div className="float-pill pill-left"><CheckCircle2 size={16} /> 5 of 6 voted</div>
          <div className="float-pill pill-right"><BarChart3 size={16} /> Consensus 8</div>
          <div className="demo-window">
            <div className="demo-topbar">
              <span className="tiny-logo"><img src="/pointpoker-logo.png" alt="" /> PointPoker</span>
              <span className="demo-live"><i /> LIVE</span>
            </div>
            <div className="demo-story">
              <span>WEB-248</span>
              <strong>Add passkey authentication</strong>
              <small>3 acceptance criteria</small>
            </div>
            <div className="demo-table">
              <div className="demo-seat seat-a"><span>{'\u{1F98A}'}</span><i className="card-back">◆</i><small>Maya</small></div>
              <div className="demo-seat seat-b"><span>{'\u{1F43C}'}</span><i className="card-back">◆</i><small>Alex</small></div>
              <div className="demo-seat seat-c"><span>{'\u{1F438}'}</span><i className="card-back">◆</i><small>Sam</small></div>
              <div className="demo-seat seat-d"><span>{'\u{1F42F}'}</span><i className="card-back">◆</i><small>Priya</small></div>
              <div className="table-felt"><span>Ready to reveal?</span><strong>5 / 6</strong></div>
            </div>
            <div className="demo-deck">
              {['1', '2', '3', '5', '8', '13', '21'].map((card) => <span className={card === '8' ? 'picked' : ''} key={card}>{card}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="create-section home-join-section" id="quick-create">
        <div className="create-heading">
          <span className="section-index">01</span>
          <div>
            <h2>Pull up a chair.</h2>
            <p>Start a quick-vote room here, or enter the code from your invitation.</p>
          </div>
        </div>
        <div className="home-room-grid">
          <form className="home-create-card" onSubmit={createRoom}>
            <div className="home-room-card-heading">
              <div><span className="mini-label">New table</span><h3>Create a room</h3><p>Start with cards only. You can enable Jira details inside the room whenever the team needs them.</p></div>
              <button className="home-full-setup-link" type="button" onClick={() => onNavigate('/create')}>Full setup <ArrowRight size={13} /></button>
            </div>
            <div className="home-create-fields">
              <label className="field-label">Room name<input value={createForm.roomName} onChange={(event) => updateCreateForm('roomName', event.target.value)} placeholder="Lowcode Llamas" maxLength={48} /></label>
              <label className="field-label">Your nickname<input value={createForm.nickname} onChange={(event) => updateCreateForm('nickname', event.target.value)} placeholder="How should the team know you?" maxLength={28} /></label>
            </div>
            <AvatarPicker value={createForm.avatar} onChange={(avatar) => updateCreateForm('avatar', avatar)} label="Choose your character" />
            {createError && <p className="form-error" role="alert">{createError}</p>}
            <button className="button primary full" type="submit" disabled={creating}>{creating ? <><LoaderCircle className="spin" size={18} /> Shuffling...</> : <>Create quick room <ArrowRight size={17} /></>}</button>
            <p className="collection-notice">Rooms auto-delete after seven days without activity. <a href="/privacy">Privacy</a></p>
          </form>

          <div className="join-card home-join-card">
            <div>
              <span className="mini-label">Already invited?</span>
              <h3>Join your team</h3>
              <p>Paste the six-character code from your invitation.</p>
            </div>
            <form className="join-code-form" onSubmit={joinRoom}>
              <input
                aria-label="Room code"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
              />
              <button className="button light" type="submit" disabled={!joinCode.trim()}>Join room <ArrowRight size={17} /></button>
            </form>
            <div className="join-art" aria-hidden="true">
              <span className="art-card art-card-1">3</span>
              <span className="art-card art-card-2">5</span>
              <span className="art-card art-card-3">8</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="how-intro"><span>Built for better conversations</span><h2>Less ceremony.<br />More shared understanding.</h2></div>
        <div className="how-steps">
          <article><b>01</b><div><h3>Frame the story</h3><p>Bring the Jira key, intent and acceptance criteria into view so the team estimates the same thing.</p></div></article>
          <article><b>02</b><div><h3>Vote independently</h3><p>Hidden cards prevent anchoring. Confidence and clarity signals surface uncertainty early.</p></div></article>
          <article><b>03</b><div><h3>Discuss the spread</h3><p>Reveal together, hear the highest and lowest voters, agree a score, and move forward.</p></div></article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-brand"><Logo /><p>Made for teams who value the conversation over the number.</p></div>
        <nav className="footer-socials" aria-label="Jack Sarg links">
          <a href="https://jacksarg.com" target="_blank" rel="noopener noreferrer me"><Globe2 size={16} /><span>Website</span></a>
          <a href="https://github.com/JackSarg" target="_blank" rel="noopener noreferrer me"><GithubIcon /><span>GitHub</span></a>
          <a href="https://www.linkedin.com/in/jacksarg/" target="_blank" rel="noopener noreferrer me"><LinkedinIcon /><span>LinkedIn</span></a>
          <a href="https://buymeacoffee.com/jacksarg" target="_blank" rel="noopener noreferrer"><Coffee size={16} /><span>Buy me a coffee</span></a>
        </nav>
        <div className="footer-meta">
          <span>&copy; 2026 JackSarg.com</span>
          <nav aria-label="Legal">
            <a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigate('/privacy') }}>Privacy</a>
            <a href="/terms" onClick={(event) => { event.preventDefault(); onNavigate('/terms') }}>Terms</a>
          </nav>
        </div>
      </footer>
    </main>
  )
}

import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Check, ClipboardList, ClipboardPaste, Link2,
  ListChecks, LoaderCircle, Sparkles, X, Zap,
} from 'lucide-react'
import AvatarPicker from './AvatarPicker'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import { api, parseAcceptanceCriteria, roomPath, saveSession } from '../lib'

const EMPTY_STORY = { key: '', title: '', description: '' }

export default function CreateRoom({ onNavigate, onBack, theme, onThemeChange }) {
  const [form, setForm] = useState({ roomName: '', nickname: '', avatar: '\u{1F98A}', detailsEnabled: false })
  const [story, setStory] = useState(EMPTY_STORY)
  const [criteriaText, setCriteriaText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const parsedCriteria = useMemo(() => parseAcceptanceCriteria(criteriaText), [criteriaText])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const updateStory = (field, value) => setStory((current) => ({ ...current, [field]: value }))

  const createRoom = async (event) => {
    event.preventDefault()
    setError('')
    if (!form.roomName.trim() || !form.nickname.trim()) {
      setError('Give your room and yourself a name first.')
      return
    }

    setBusy(true)
    try {
      const data = await api('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: form.roomName,
          nickname: form.nickname,
          avatar: form.avatar,
          detailsEnabled: form.detailsEnabled,
          story: form.detailsEnabled ? { ...story, criteria: parsedCriteria } : undefined,
        }),
      })
      saveSession(data.code, { playerId: data.playerId, token: data.token })
      onNavigate(roomPath(data.code))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="create-room-page">
      <div className="join-glow" />
      <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={16} /> Back home</button>
      <div className="join-theme-control"><ThemeToggle theme={theme} onThemeChange={onThemeChange} /></div>

      <form className={`create-room-shell ${form.detailsEnabled ? 'has-jira-details' : ''}`} onSubmit={createRoom}>
        <section className="create-room-panel">
          <Logo />
          <div className="create-room-intro">
            <span className="mini-label">New table</span>
            <h1>Create a new room</h1>
            <p>Choose your table identity, then invite the team.</p>
          </div>

          <label className="field-label">
            Room name
            <input autoFocus value={form.roomName} onChange={(event) => update('roomName', event.target.value)} placeholder="Lowcode Llamas" maxLength={48} />
          </label>
          <label className="field-label">
            Your nickname
            <input value={form.nickname} onChange={(event) => update('nickname', event.target.value)} placeholder="How should the team know you?" maxLength={28} />
          </label>

          <div className={`room-mode-control ${form.detailsEnabled ? 'details-on' : ''}`}>
            <span className="mode-icon">{form.detailsEnabled ? <ClipboardList size={19} /> : <Zap size={19} />}</span>
            <div>
              <strong>Include Jira story details</strong>
              <small>{form.detailsEnabled ? 'The story panel is open beside this form.' : 'Off - jump straight into a quick vote.'}</small>
            </div>
            <button
              className="toggle-switch"
              type="button"
              role="switch"
              aria-label="Include Jira story details"
              aria-controls="create-jira-panel"
              aria-checked={form.detailsEnabled}
              onClick={() => update('detailsEnabled', !form.detailsEnabled)}
            ><span /></button>
          </div>

          <AvatarPicker value={form.avatar} onChange={(avatar) => update('avatar', avatar)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full create-room-submit" type="submit" disabled={busy}>
            {busy ? <><LoaderCircle className="spin" size={18} /> Shuffling...</> : <>Create room <ArrowRight size={18} /></>}
          </button>
          <p className="form-foot"><Link2 size={13} /> A shareable link is generated instantly.</p>
          <p className="collection-notice">Rooms auto-delete after seven days without activity. Room data is shared with invited participants. <a href="/privacy">Privacy</a></p>
        </section>

        {form.detailsEnabled && (
          <aside className="create-jira-panel" id="create-jira-panel">
            <div className="create-jira-header">
              <span className="icon-tile"><ClipboardList size={20} /></span>
              <div><span className="mini-label">Optional context</span><h2>Set the table</h2><p>Paste the useful parts of the Jira ticket before everyone joins.</p></div>
              <button className="icon-button" type="button" onClick={() => update('detailsEnabled', false)} aria-label="Close Jira details"><X size={18} /></button>
            </div>

            <div className="story-form-grid">
              <label className="field-label compact">Issue key<input value={story.key} onChange={(event) => updateStory('key', event.target.value.toUpperCase())} placeholder="WEB-248" maxLength={24} /></label>
              <label className="field-label title-field">Story title<input value={story.title} onChange={(event) => updateStory('title', event.target.value)} placeholder="Add the first story to the table" maxLength={140} /></label>
            </div>
            <label className="field-label">Description<textarea value={story.description} onChange={(event) => updateStory('description', event.target.value)} placeholder="Give the team enough context to estimate complexity, effort and uncertainty." rows={4} maxLength={700} /></label>

            <fieldset className="criteria-fieldset">
              <div className="criteria-heading">
                <div><legend>Acceptance criteria</legend><p>Paste them exactly as they appear in Jira. We will clean up the formatting.</p></div>
                <span><ClipboardPaste size={14} /> Paste friendly</span>
              </div>
              <div className="criteria-paste-box">
                <ClipboardPaste size={18} />
                <textarea
                  aria-label="Acceptance criteria"
                  value={criteriaText}
                  onChange={(event) => setCriteriaText(event.target.value)}
                  placeholder={'Paste bullets, numbered steps or AC labels...\n\n- Customer can register a passkey\n- Unsupported devices see a fallback'}
                  rows={7}
                />
              </div>
              {parsedCriteria.length > 0 ? (
                <div className="criteria-preview">
                  <div><span><ListChecks size={14} /> {parsedCriteria.length} {parsedCriteria.length === 1 ? 'criterion' : 'criteria'} detected</span><small><Sparkles size={12} /> Formatting cleaned automatically</small></div>
                  <ol>{parsedCriteria.map((criterion, index) => <li key={`${criterion}-${index}`}><span>{index + 1}</span><p>{criterion}</p></li>)}</ol>
                </div>
              ) : (
                <p className="criteria-empty"><Sparkles size={12} /> Try bullets, AC1, TAC1, 1. or one criterion per line.</p>
              )}
            </fieldset>
            <p className="create-jira-note"><Check size={14} /> These details will be waiting in round one.</p>
          </aside>
        )}
      </form>
    </main>
  )
}

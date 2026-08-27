import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowRight, Check, ChevronDown, CircleHelp, Clock3, Coffee, Copy, Crown, Database, Diamond,
  ClipboardList, DoorOpen, Edit3, Eye, EyeOff, History, LoaderCircle, Menu, MessageCircleQuestion,
  MoreHorizontal, Play, RotateCcw, Share2, SmilePlus, Sparkles, TimerOff, Trash2, UserMinus, Users, Wifi, WifiOff, X,
  Zap,
} from 'lucide-react'
import EmojiPickerDialog from './EmojiPickerDialog'
import Analytics from './Analytics'
import Logo from './Logo'
import PokerTable from './PokerTable'
import StoryEditor from './StoryEditor'
import ThemeToggle from './ThemeToggle'
import TimerSelect from './TimerSelect'
import { clearSession } from '../lib'

function formatClock(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const DEFAULT_REACTIONS = ['👍', '🤔', '💡', '🔥']
const RECENT_REACTIONS_KEY = 'pointpoker:recent-reactions'

function getRecentReactions() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENT_REACTIONS_KEY))
    if (Array.isArray(stored) && stored.length) return stored.filter((item) => typeof item === 'string').slice(0, 5)
  } catch {
    // Fall back to the starter set if local storage is unavailable or malformed.
  }
  return DEFAULT_REACTIONS
}

function Participants({ state, me, onTransferHost, onKickPlayer, onDeleteHistoryEntry, onClearHistory, onDeleteRoom }) {
  const [pendingPlayerId, setPendingPlayerId] = useState(null)
  const [confirmingClearHistory, setConfirmingClearHistory] = useState(false)

  return (
    <aside className="participants-panel">
      <div className="panel-title"><span><Users size={16} /> Players</span><b>{state.participants.filter((person) => person.online).length} online</b></div>
      <div className="participant-list">
        {state.participants.map((person, index) => {
          const vote = state.round.votes[person.id]
          const canManagePlayer = Boolean(me.isHost && person.id !== me.id)
          const canTransferHost = Boolean(canManagePlayer && person.online)
          const showingPlayerActions = pendingPlayerId === person.id
          return (
            <div className={`participant-row ${!person.online ? 'offline' : ''} ${canManagePlayer ? 'can-manage-player' : ''} ${showingPlayerActions ? 'pending-player-action' : ''}`} key={person.id}>
              <button
                type="button"
                className="participant-row-main"
                disabled={!canManagePlayer}
                onClick={() => setPendingPlayerId(person.id)}
                aria-label={canManagePlayer ? `Manage ${person.nickname}` : undefined}
                title={canManagePlayer ? `Manage ${person.nickname}` : undefined}
              >
                <span className={`participant-avatar avatar-tone-${index % 6}`}>{person.avatar}<i className={person.online ? 'online' : ''} /></span>
                <span className="participant-name"><strong>{person.nickname}</strong><small>{person.id === me.id ? 'You' : person.isHost ? 'Facilitator' : canManagePlayer ? person.online ? 'Click to manage' : 'Away - click to manage' : person.online ? 'At the table' : 'Away'}</small></span>
                {person.isHost && <Crown className="host-crown" size={14} fill="currentColor" />}
                {state.round.status === 'voting' && <span className={`vote-status ${vote ? 'done' : ''}`}>{vote ? <Check size={13} /> : <MoreHorizontal size={15} />}</span>}
                {state.round.status === 'revealed' && vote && <span className="mini-vote">{vote.value}</span>}
              </button>
              {showingPlayerActions && (
                <div className="participant-action-confirm">
                  <span>Manage <strong>{person.nickname}</strong></span>
                  <div className={`participant-action-buttons ${canTransferHost ? '' : 'single'}`}>
                    {canTransferHost && <button type="button" className="host-transfer-confirm-button" onClick={() => { setPendingPlayerId(null); onTransferHost(person) }}><Crown size={11} /> Make host</button>}
                    <button type="button" className="player-kick-button" onClick={() => { setPendingPlayerId(null); onKickPlayer(person) }}><UserMinus size={11} /> Kick</button>
                  </div>
                  <button type="button" className="host-transfer-cancel-button" onClick={() => setPendingPlayerId(null)} aria-label="Cancel player actions"><X size={13} /></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {state.history.length > 0 && (
        <div className="history-block">
          <div className="panel-title">
            <span><History size={15} /> History</span>
            <div className="history-heading-actions">
              <b>{state.history.length}</b>
              {me.isHost && <button type="button" className={confirmingClearHistory ? 'confirming' : ''} onClick={() => { if (confirmingClearHistory) { setConfirmingClearHistory(false); onClearHistory() } else setConfirmingClearHistory(true) }}>{confirmingClearHistory ? 'Confirm' : 'Clear all'}</button>}
            </div>
          </div>
          <div className="history-list">
            {state.history.map((item) => (
              <div className="history-row" key={`${item.roundNumber}-${item.completedAt}`}>
                <span><b>{item.story.key || `Round ${item.roundNumber}`}</b><small>{item.story.title}</small></span>
                <strong>{item.finalEstimate || '—'}</strong>
                {me.isHost && <button type="button" className="history-delete-button" onClick={() => onDeleteHistoryEntry(item)} aria-label={`Delete round ${item.roundNumber} from history`} title="Delete this completed round"><Trash2 size={12} /></button>}
              </div>
            ))}
          </div>
        </div>
      )}
      {me.isHost && (
        <div className="room-data-controls">
          <span><Database size={15} /><span><strong>Room data</strong><small>Host controls</small></span></span>
          <button type="button" onClick={onDeleteRoom}><Trash2 size={13} /> Delete room</button>
        </div>
      )}
      <div className="privacy-note"><EyeOff size={14} /><span><strong>Votes stay private</strong><br />until the facilitator reveals.</span></div>
    </aside>
  )
}

function DeleteRoomDialog({ room, deleting, onClose, onDelete }) {
  return (
    <div className="delete-room-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !deleting && onClose()}>
      <form className="delete-room-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-room-title" onSubmit={(event) => { event.preventDefault(); if (!deleting) onDelete() }}>
        <button type="button" className="delete-room-close" onClick={onClose} disabled={deleting} aria-label="Close room deletion confirmation"><X size={18} /></button>
        <span className="delete-room-icon"><AlertTriangle size={24} /></span>
        <span className="mini-label">Permanent deletion</span>
        <h2 id="delete-room-title">Delete this room and all its data?</h2>
        <p>This permanently removes <strong>{room.name}</strong>, its participants, story context, current votes, completed-round history and leaderboard from PointPoker. Everyone at the table will be disconnected. This cannot be undone.</p>
        <div className="delete-room-actions">
          <button type="button" className="button ghost dark" onClick={onClose} disabled={deleting} autoFocus>Keep room</button>
          <button type="submit" className="delete-room-confirm" disabled={deleting}>{deleting ? <><LoaderCircle className="spin" size={16} /> Deleting...</> : <><Trash2 size={15} /> Delete room forever</>}</button>
        </div>
      </form>
    </div>
  )
}

export default function GameRoom({ code, session, onLeave, theme, onThemeChange }) {
  const [state, setState] = useState(null)
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [newStoryEditor, setNewStoryEditor] = useState(false)
  const [startAfterStory, setStartAfterStory] = useState(false)
  const [changingVoteFor, setChangingVoteFor] = useState(null)
  const [confidence, setConfidence] = useState('medium')
  const [duration, setDuration] = useState(5)
  const [now, setNow] = useState(0)
  const [toastMessage, setToastMessage] = useState('')
  const [reactions, setReactions] = useState([])
  const [recentReactions, setRecentReactions] = useState(getRecentReactions)
  const [reactionPicker, setReactionPicker] = useState(null)
  const [quickReaction, setQuickReaction] = useState(null)
  const [mobilePanel, setMobilePanel] = useState(false)
  const [analyticsRoundKey, setAnalyticsRoundKey] = useState(null)
  const [deleteRoomOpen, setDeleteRoomOpen] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const socketRef = useRef(null)
  const toastTimer = useRef(null)
  const removedRef = useRef(false)
  const roomDeletedRef = useRef(false)
  const onLeaveRef = useRef(onLeave)

  useEffect(() => { onLeaveRef.current = onLeave }, [onLeave])

  const toast = useCallback((message) => {
    setToastMessage(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMessage(''), 2600)
  }, [])

  useEffect(() => {
    let active = true
    let reconnectTimer
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/api/rooms/${code}/ws`,
        'pointpoker-v1',
      )
      socketRef.current = socket
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'authenticate', playerId: session.playerId, token: session.token }))
      }
      socket.onmessage = (event) => {
        if (!active) return
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        if (message.type === 'state') {
          setState(message.state)
          setConnected(true)
          setConnectionError('')
        }
        if (message.type === 'error') {
          setDeletingRoom(false)
          toast(message.message)
        }
        if (message.type === 'host_transferred') toast(`${message.nickname} is now the host`)
        if (message.type === 'player_removed') toast(`${message.nickname} was removed from the room`)
        if (message.type === 'removed') {
          removedRef.current = true
          clearSession(code)
          setState(null)
          setConnectionError(message.message || 'The host removed you from this room.')
        }
        if (message.type === 'room_deleted') {
          roomDeletedRef.current = true
          clearSession(code)
          onLeaveRef.current()
        }
        if (message.type === 'reaction') {
          setReactions((current) => [...current.slice(-5), message])
          setTimeout(() => setReactions((current) => current.filter((item) => item.id !== message.id)), 1800)
        }
      }
      socket.onclose = (event) => {
        if (!active) return
        setConnected(false)
        if (roomDeletedRef.current || (event.code === 1008 && event.reason === 'Room deleted')) {
          roomDeletedRef.current = true
          clearSession(code)
          onLeaveRef.current()
          return
        }
        if (event.code === 1001 && event.reason === 'Room expired') {
          clearSession(code)
          setState(null)
          setConnectionError('This room has expired and its stored data has been deleted.')
          return
        }
        if (removedRef.current || (event.code === 1008 && event.reason === 'Removed by host')) {
          removedRef.current = true
          clearSession(code)
          setState(null)
          setConnectionError('The host removed you from this room.')
          return
        }
        if (event.code === 1008 || event.code === 1003) {
          setConnectionError('Your seat could not be restored. Return home and join again.')
        } else {
          reconnectTimer = setTimeout(connect, 1400)
        }
      }
      socket.onerror = () => { if (active) setConnected(false) }
    }
    connect()
    return () => {
      active = false
      clearTimeout(reconnectTimer)
      socketRef.current?.close(1000, 'Left page')
    }
  }, [code, session.playerId, session.token, toast])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (state?.round.status !== 'revealed') return undefined
    const revealedRoundKey = `${state.round.number}:${state.round.startedAt || 'lobby'}`
    const timer = setTimeout(() => setAnalyticsRoundKey(revealedRoundKey), 3_000)
    return () => clearTimeout(timer)
  }, [state?.round.number, state?.round.startedAt, state?.round.status])

  const send = useCallback((type, payload = {}) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type, ...payload }))
    else toast('Still reconnecting to the table…')
  }, [toast])

  const sendReaction = useCallback((value, targetPlayerId = null) => {
    send('reaction', { value, targetPlayerId })
    setRecentReactions((current) => {
      const next = [value, ...current.filter((item) => item !== value)].slice(0, 5)
      try {
        localStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(next))
      } catch {
        // Recents still work for this visit when storage is unavailable.
      }
      return next
    })
  }, [send])

  const selectReaction = useCallback((value) => {
    const targetPlayerId = reactionPicker?.targetPlayerId || null
    sendReaction(value, targetPlayerId)
    if (targetPlayerId) {
      setQuickReaction({
        value,
        targetPlayerId,
        targetNickname: reactionPicker.targetNickname,
      })
    }
  }, [reactionPicker, sendReaction])

  const me = useMemo(() => state?.participants.find((person) => person.id === session.playerId), [state, session.playerId])
  const isHost = me?.isHost
  const detailsEnabled = state?.detailsEnabled ?? true
  const myVote = state?.round.votes[session.playerId]
  const votedCount = state ? Object.keys(state.round.votes).length : 0
  const readyCount = state?.participants.filter((person) => person.readiness === 'ready').length || 0
  const roundKey = state ? `${state.round.number}:${state.round.startedAt || 'lobby'}` : ''
  const revealedRoundKey = state?.round.status === 'revealed' ? roundKey : null
  const showAnalytics = Boolean(revealedRoundKey && analyticsRoundKey === revealedRoundKey)
  const remaining = state?.round.startedAt && state.round.durationMinutes > 0
    ? Math.min(state.round.durationMinutes * 60_000, state.round.startedAt + state.round.durationMinutes * 60_000 - now)
    : null

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${code}`)
    toast('Invite link copied')
  }

  const openStoryEditor = (isNewStory = false) => {
    setNewStoryEditor(isNewStory)
    setEditorOpen(true)
  }

  const closeStoryEditor = () => {
    setEditorOpen(false)
    setNewStoryEditor(false)
    setStartAfterStory(false)
  }

  const saveStory = (story) => {
    send('update_story', { story })
    if (startAfterStory) send('start_round', { durationMinutes: duration })
    setEditorOpen(false)
    setNewStoryEditor(false)
    setStartAfterStory(false)
    toast(startAfterStory ? 'Story saved — voting is open' : 'Story updated')
  }

  const setDetailsMode = (enabled) => {
    send('toggle_details', { enabled })
    toast(enabled ? 'Jira story details enabled' : 'Quick vote mode enabled')
  }

  const castVote = (value) => {
    send('vote', { value, confidence })
    setChangingVoteFor(null)
    if (navigator.vibrate) navigator.vibrate(25)
  }

  const updateConfidence = (value) => {
    setConfidence(value)
    if (myVote) send('vote', { value: myVote.value, confidence: value })
  }

  const revote = () => {
    setChangingVoteFor(null)
    send('revote', { durationMinutes: duration })
  }

  const nextStory = () => {
    setChangingVoteFor(null)
    if (detailsEnabled) {
      setStartAfterStory(true)
      send('next_round', { autoStart: false, durationMinutes: duration })
      setTimeout(() => openStoryEditor(true), 180)
    } else {
      send('next_round', { autoStart: true, durationMinutes: duration })
      toast('New round started')
    }
  }

  const openDeleteRoom = () => {
    setMobilePanel(false)
    setDeletingRoom(false)
    setDeleteRoomOpen(true)
  }

  const closeDeleteRoom = () => {
    if (deletingRoom) return
    setDeleteRoomOpen(false)
  }

  const deleteRoom = () => {
    setDeletingRoom(true)
    send('delete_room')
  }

  if (!state || !me) {
    return (
      <div className="full-loader room-loader"><Logo /><LoaderCircle className="spin" /><p>{connectionError || 'Pulling up a chair…'}</p>{connectionError && <button className="button light" onClick={onLeave}>Back home</button>}</div>
    )
  }

  return (
    <div className="room-shell">
      <header className="room-header">
        <Logo href="/" newTab />
        <div className="room-identity"><strong>{state.name}</strong><button onClick={() => { navigator.clipboard.writeText(code); toast('Room code copied') }}>{code} <Copy size={12} /></button></div>
        <div className="header-status"><span className={connected ? 'connected' : ''}>{connected ? <Wifi size={13} /> : <WifiOff size={13} />}{connected ? 'Live' : 'Reconnecting'}</span></div>
        <div className="header-actions">
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
          <button className="button ghost dark small share-button" onClick={copyLink}><Share2 size={15} /> Invite players</button>
          <button className="icon-button" onClick={() => setMobilePanel(true)} aria-label="Show players"><Menu size={19} /></button>
          <button className="icon-button desktop-leave" onClick={onLeave} aria-label="Leave room"><DoorOpen size={18} /></button>
        </div>
      </header>

      <div className="room-layout">
        <div className={`mobile-panel-scrim ${mobilePanel ? 'open' : ''}`} onClick={() => setMobilePanel(false)} />
        <div className={`participants-wrap ${mobilePanel ? 'open' : ''}`}><button className="close-panel" onClick={() => setMobilePanel(false)}><X size={18} /></button><Participants state={state} me={me} onTransferHost={(person) => send('transfer_host', { targetPlayerId: person.id })} onKickPlayer={(person) => send('kick_player', { targetPlayerId: person.id })} onDeleteHistoryEntry={(item) => { send('delete_history_entry', { completedAt: item.completedAt }); toast(`Round ${item.roundNumber} removed from history`) }} onClearHistory={() => { send('clear_history'); toast('Completed round history cleared') }} onDeleteRoom={openDeleteRoom} /></div>

        <main className="game-main">
          <div className={`table-flip-scene ${showAnalytics ? 'is-flipped' : ''}`}>
            <div className="table-flip-card">
              <section className="table-section table-face table-front" aria-hidden={showAnalytics}>
                <div className={`round-statusbar ${state.round.status === 'lobby' ? 'lobby-statusbar' : ''}`}>
                  <div>
                    {state.round.status === 'lobby' && <><span className="status-icon lobby"><CircleHelp size={16} /></span><span><strong>{detailsEnabled ? 'Clarity check' : 'Ready check'}</strong><small>{detailsEnabled ? 'Read the story, then signal your readiness.' : 'Start whenever everyone is at the table.'}</small></span></>}
                    {state.round.status === 'voting' && <><span className="status-icon voting"><Diamond size={14} fill="currentColor" /></span><span><strong>Cards are down</strong><small>{votedCount} of {state.participants.length} votes are in.</small></span></>}
                    {state.round.status === 'revealed' && <><span className="status-icon revealed"><Eye size={16} /></span><span><strong>Turning the page…</strong><small>Your round results are ready.</small></span></>}
                  </div>
                  <div className="round-status-actions">
                    {state.round.status === 'lobby' && (
                      <>
                        <div className="table-readiness-options">
                          <button className={me.readiness === 'question' ? 'selected question' : ''} onClick={() => send('readiness', { value: 'question' })}><MessageCircleQuestion size={14} /> I have a question</button>
                          <button className={me.readiness === 'ready' ? 'selected ready' : ''} onClick={() => send('readiness', { value: 'ready' })}><Check size={14} /> Ready</button>
                          <button className={me.readiness === 'brb' ? 'selected brb' : ''} onClick={() => send('readiness', { value: 'brb' })}><Coffee size={14} /> BRB</button>
                        </div>
                        {isHost ? (
                          <>
                            <TimerSelect value={duration} onChange={setDuration} />
                            <button className="table-start-button" onClick={() => send('start_round', { durationMinutes: duration })}><Play size={13} fill="currentColor" /> Start voting <span>{readyCount}/{state.participants.length}</span></button>
                          </>
                        ) : <span className="table-waiting"><i className="waiting-pulse" /> Waiting for the host</span>}
                      </>
                    )}
                    {state.round.status === 'voting' && remaining !== null && <span className={`round-clock ${remaining <= 0 ? 'expired' : ''}`}><Clock3 size={14} /> {remaining <= 0 ? 'Time' : formatClock(remaining)}</span>}
                    {state.round.status === 'voting' && state.round.durationMinutes === 0 && <span className="round-clock no-limit"><TimerOff size={14} /> No limit</span>}
                    {isHost && state.round.status === 'voting' && <button className="table-reveal-button" onClick={() => send('reveal')} disabled={votedCount === 0}><Eye size={14} /> Reveal <span>{votedCount}/{state.participants.length}</span></button>}
                  </div>
                </div>
                <PokerTable state={state} me={me} reactions={reactions} quickReaction={quickReaction} onVote={castVote} confidence={confidence} onConfidence={updateConfidence} changingVote={changingVoteFor === roundKey} onChangeVote={() => setChangingVoteFor(roundKey)} onReactTo={(person) => setReactionPicker({ targetPlayerId: person.id, targetNickname: person.nickname })} onRepeatReaction={(reaction) => sendReaction(reaction.value, reaction.targetPlayerId)} />
                <div className="reaction-strip">
                  <span>React</span>
                  {recentReactions.slice(0, 5).map((reaction) => <button key={reaction} onClick={() => sendReaction(reaction)} aria-label={`React with ${reaction}`}>{reaction}</button>)}
                  <button className="open-emoji-picker" onClick={() => setReactionPicker({ targetPlayerId: null, targetNickname: null })} aria-label="Choose another emoji"><SmilePlus size={14} /></button>
                </div>
              </section>

              <section className="table-section table-face table-back" aria-hidden={!showAnalytics}>
                <div className="round-statusbar results-statusbar">
                  <div><span className="status-icon revealed"><Eye size={16} /></span><span><strong>Cards revealed</strong><small>Explore the spread before settling on a number.</small></span></div>
                  <div className="round-status-actions">
                    {isHost && state.round.status === 'revealed' && <><button className="table-round-button secondary" onClick={revote}><RotateCcw size={13} /> Revote</button><button className="table-round-button primary" onClick={nextStory} disabled={!state.round.finalEstimate} title={!state.round.finalEstimate ? 'Choose the winning estimate first' : 'Start the next story'}>{state.round.finalEstimate ? 'Next story' : 'Pick winner first'} <ArrowRight size={13} /></button></>}
                  </div>
                </div>
                {showAnalytics && <Analytics state={state} isHost={isHost} send={send} toast={toast} />}
              </section>
            </div>
          </div>

          {detailsEnabled ? (
            <section className="story-card story-card-below">
              <div className="story-topline">
                <div className="story-labels">{state.story.key && <span className="issue-key">{state.story.key}</span>}<span className="round-label">Round {state.round.number}</span></div>
                {isHost && state.round.status !== 'voting' && <div className="story-actions"><button className="edit-story" onClick={() => openStoryEditor(false)}><Edit3 size={14} /> Edit story</button><div className="inline-mode-toggle"><span>Jira details</span><button className="toggle-switch small is-on" type="button" role="switch" aria-label="Include Jira story details" aria-checked={true} onClick={() => setDetailsMode(false)}><span /></button></div></div>}
              </div>
              <h1>{state.story.title || 'No story added yet'}</h1>
              <p>{state.story.description || 'Add Jira story context before the team estimates.'}</p>
              {state.story.criteria.length > 0 && <details className="criteria-details" open><summary><Check size={14} /> {state.story.criteria.length} acceptance {state.story.criteria.length === 1 ? 'criterion' : 'criteria'} <ChevronDown size={14} /></summary><ul>{state.story.criteria.map((item, index) => <li key={index}><Check size={13} />{item}</li>)}</ul></details>}
              {isHost && !state.story.key && <button className="inline-prompt" onClick={() => openStoryEditor(false)}><Sparkles size={15} /> Add Jira context before the first vote</button>}
            </section>
          ) : (
            <section className="story-card quick-story-card story-card-below">
              <span className="quick-mode-icon"><Zap size={18} fill="currentColor" /></span>
              <div><span className="mini-label">Round {state.round.number} · Quick vote</span><h1>Cards only. No ticket setup needed.</h1><p>You can add the Jira key and acceptance criteria whenever the team needs more context.</p></div>
              {isHost && <div className="quick-mode-action"><div><span>Jira details</span><button className="toggle-switch small" type="button" role="switch" aria-label="Include Jira story details" aria-checked={false} onClick={() => setDetailsMode(true)}><span /></button></div><button className="enable-details-link" onClick={() => setDetailsMode(true)}><ClipboardList size={14} /> Add story details</button></div>}
            </section>
          )}

        </main>
      </div>

      {editorOpen && <StoryEditor story={newStoryEditor ? { key: '', title: '', description: '', criteria: [] } : state.story} onClose={closeStoryEditor} onSave={saveStory} />}
      {reactionPicker && <EmojiPickerDialog open onClose={() => setReactionPicker(null)} onSelect={selectReaction} recent={recentReactions} targetNickname={reactionPicker.targetNickname} theme={theme} />}
      {deleteRoomOpen && <DeleteRoomDialog room={{ name: state.name }} deleting={deletingRoom} onClose={closeDeleteRoom} onDelete={deleteRoom} />}
      {toastMessage && <div className="toast"><Check size={16} /> {toastMessage}</div>}
    </div>
  )
}

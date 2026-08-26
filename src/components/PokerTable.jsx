import { Coffee, Crown, Diamond, EyeOff, HelpCircle, SmilePlus } from 'lucide-react'
import { CARDS } from '../lib'

const confidenceLevels = [
  { value: 'low', label: 'Unsure', bars: 1 },
  { value: 'medium', label: 'Fairly sure', bars: 2 },
  { value: 'high', label: 'Confident', bars: 3 },
]
function seatPosition(index, total) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return { x: 50 + Math.cos(angle) * 47, y: 50 + Math.sin(angle) * 42 }
}


export default function PokerTable({ state, me, reactions, quickReaction, onVote, confidence, onConfidence, changingVote, onChangeVote, onReactTo, onRepeatReaction }) {
  const { participants, round } = state
  const detailsEnabled = state.detailsEnabled ?? true
  const visible = participants.slice(0, 10)
  const total = Math.max(visible.length, 2)

  return (
    <div className="poker-stage">
      <div className="poker-table">
        <div className="table-rim" />
        <div className="table-center">
          <span className="table-brand"><img src="/pointpoker-logo.png" alt="" /> POINTPOKER</span>
          {round.status === 'voting' ? (
            <><strong>{Object.keys(round.votes).length}<small> / {participants.length}</small></strong><span>cards played</span></>
          ) : round.status === 'revealed' ? (
            <><strong className="reveal-word">Revealed</strong><span>compare the thinking</span></>
          ) : (
            <><HelpCircle size={24} /><strong className="lobby-word">{detailsEnabled ? 'Read the story' : 'Ready to play?'}</strong><span>{detailsEnabled ? 'signal when you’re ready' : 'the host can deal the cards'}</span></>
          )}
        </div>
      </div>

      {visible.map((person, index) => {
        const { x, y } = seatPosition(index, total)
        const vote = round.votes[person.id]
        const showValue = round.status === 'revealed' || person.id === me.id
        const pickerVertical = y > 55 ? 'above' : 'below'
        const pickerAlign = x < 30 ? 'left' : x > 70 ? 'right' : 'center'
        return (
          <div className={`player-seat ${person.id === me.id ? 'is-me' : ''} ${!person.online ? 'is-offline' : ''}`} key={person.id} style={{ '--seat-x': `${x}%`, '--seat-y': `${y}%` }}>
            <button type="button" className={`seat-avatar avatar-tone-${index % 6} ${person.id !== me.id && person.online ? 'is-reactable' : ''}`} disabled={person.id === me.id || !person.online} aria-label={person.id === me.id ? 'Your player' : `Throw an emoji at ${person.nickname}`} onClick={() => onReactTo(person)}>
              <span>{person.avatar}</span>
              {person.isHost && <i title="Facilitator"><Crown size={10} fill="currentColor" /></i>}
              <b className={person.online ? 'online' : ''} />
              {(person.chips || 0) > 0 && <em className="seat-chip-count" title={`${person.chips} correct ${person.chips === 1 ? 'estimate' : 'estimates'}`}><span />{person.chips}</em>}
              {person.id !== me.id && person.online && <span className="seat-react-hint"><SmilePlus size={10} /></span>}
            </button>
            <div className={`seat-card ${vote ? 'has-vote' : ''} ${round.status === 'revealed' ? 'is-revealed' : ''}`}>
              {vote && showValue ? <strong>{vote.value}</strong> : vote ? <Diamond size={15} fill="currentColor" /> : <span>—</span>}
            </div>
            <span className="seat-name">{person.nickname}{person.id === me.id ? ' · you' : ''}</span>
            {quickReaction?.targetPlayerId === person.id && person.online && (
              <button
                type="button"
                className={`seat-quick-reaction quick-reaction-${x < 50 ? 'left' : 'right'}`}
                onClick={() => onRepeatReaction(quickReaction)}
                aria-label={`Throw ${quickReaction.value} at ${person.nickname} again`}
                title={`Throw ${quickReaction.value} at ${person.nickname} again`}
              >
                <span>{quickReaction.value}</span>
                <small>again</small>
              </button>
            )}
            {person.readiness && round.status === 'lobby' && <span className={`readiness-dot ${person.readiness}`}>{person.readiness === 'ready' ? 'Ready' : 'Question'}</span>}
            {person.id === me.id && round.status === 'voting' && (!vote || changingVote) && (
              <div className={`board-picker picker-${pickerVertical} picker-${pickerAlign}`}>
                <div className="board-picker-heading">
                  <span><Diamond size={11} fill="currentColor" /> {vote ? `Card ${vote.value} is down` : 'Choose your card'}</span>
                  <small><EyeOff size={11} /> Only you can see it</small>
                </div>
                <div className="board-voting-cards">
                  {CARDS.map((card) => (
                    <button
                      aria-label={card === '☕' ? 'Take a coffee break' : `Vote ${card}`}
                      className={vote?.value === card ? 'selected' : ''}
                      key={card}
                      onClick={() => onVote(card)}
                    >
                      {card === '☕' ? <Coffee size={17} /> : card}
                    </button>
                  ))}
                </div>
                <div className="board-confidence">
                  <span>Confidence</span>
                  {confidenceLevels.map((level) => (
                    <button className={confidence === level.value ? 'selected' : ''} key={level.value} onClick={() => onConfidence(level.value)} title={level.label}>
                      <i>{[1, 2, 3].map((bar) => <b className={bar <= level.bars ? 'on' : ''} key={bar} />)}</i>
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {person.id === me.id && round.status === 'voting' && vote && !changingVote && (
              <div className={`board-vote-summary picker-${pickerVertical} picker-${pickerAlign}`}>
                <span className="summary-card">{vote.value === '☕' ? <Coffee size={16} /> : vote.value}</span>
                <span><small>Your card</small><strong>Locked in</strong></span>
                <button onClick={onChangeVote}>Change card</button>
              </div>
            )}
          </div>
        )
      })}

      {reactions.map((reaction) => {
        const senderIndex = visible.findIndex((person) => person.id === reaction.playerId)
        const targetIndex = visible.findIndex((person) => person.id === (reaction.targetPlayerId || reaction.playerId))
        if (senderIndex < 0 || targetIndex < 0) return null
        const start = seatPosition(senderIndex, total)
        const end = seatPosition(targetIndex, total)
        const targeted = targetIndex !== senderIndex
        return (
          <span
            className={`floating-reaction ${targeted ? 'is-thrown' : ''}`}
            key={reaction.id}
            style={{
              '--reaction-start-x': `${start.x}%`, '--reaction-start-y': `${start.y - 2}%`,
              '--reaction-mid-x': `${(start.x + end.x) / 2}%`, '--reaction-mid-y': `${Math.min(start.y, end.y) - 14}%`,
              '--reaction-end-x': `${end.x}%`, '--reaction-end-y': `${end.y - 3}%`,
            }}
          >{reaction.value}</span>
        )
      })}
    </div>
  )
}

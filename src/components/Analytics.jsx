import { BarChart3, CheckCircle2, Clipboard, Gauge, Trophy, TrendingUp } from 'lucide-react'
import { CARDS, getAnalytics } from '../lib'

export default function Analytics({ state, isHost, send, toast }) {
  const analytics = getAnalytics(state.round.votes)
  const entries = Object.entries(analytics.counts).sort((a, b) => CARDS.indexOf(a[0]) - CARDS.indexOf(b[0]))
  const maxCount = Math.max(...entries.map(([, count]) => count), 1)
  const splitSuggested = analytics.spread !== null && analytics.spread >= 8
  const roundWinners = new Set(state.round.awardedPlayerIds || [])
  const leaderboard = [...state.participants].sort((a, b) => (b.chips || 0) - (a.chips || 0) || a.joinedAt - b.joinedAt)

  const copySummary = async () => {
    const finalScore = state.round.finalEstimate || analytics.mode
    const summary = `${state.story.key ? `${state.story.key}: ` : ''}${state.story.title}\nEstimate: ${finalScore} story points\nVotes: ${analytics.revealed.map((vote) => vote.value).join(', ')}\nAverage: ${analytics.average?.toFixed(1) ?? 'N/A'} · Confidence: ${analytics.confidence}%`
    await navigator.clipboard.writeText(summary)
    toast('Summary copied for Jira')
  }

  return (
    <section className="results-panel">
      <div className="results-heading">
        <div><span className="mini-label">Round {state.round.number} results</span><h2>Here’s the shape of the room.</h2></div>
        <button className="button ghost dark small" onClick={copySummary}><Clipboard size={15} /> Copy for Jira</button>
      </div>
      <div className="stat-grid">
        <article><span><BarChart3 size={16} /> Average</span><strong>{analytics.average?.toFixed(1) ?? '—'}</strong><small>Numeric votes only</small></article>
        <article className="accent-stat"><span><CheckCircle2 size={16} /> Most common</span><strong>{analytics.mode}</strong><small>{analytics.mode === '—' ? 'No clear mode' : `${analytics.counts[analytics.mode]} matching cards`}</small></article>
        <article><span><TrendingUp size={16} /> Spread</span><strong>{analytics.spread ?? '—'}</strong><small>{splitSuggested ? 'Worth a conversation' : 'Team is fairly close'}</small></article>
        <article><span><Gauge size={16} /> Confidence</span><strong>{analytics.confidence}%</strong><small>Self-reported certainty</small></article>
      </div>

      <div className="results-detail-grid">
        <div className="distribution-card">
          <h3>Vote distribution</h3>
          <div className="distribution-bars">
            {entries.map(([card, count]) => (
              <div className="distribution-item" key={card}>
                <div className="bar-track"><span style={{ height: `${Math.max((count / maxCount) * 100, 12)}%` }}><b>{count}</b></span></div>
                <strong>{card}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="leaderboard-card">
          <div className="leaderboard-heading">
            <span className="leaderboard-icon"><Trophy size={18} /></span>
            <div><span className="mini-label">Session leaderboard</span><h3>{state.round.finalEstimate ? 'Most correct estimates' : 'The first chips are up for grabs'}</h3></div>
          </div>
          <ol className="leaderboard-list">
            {leaderboard.slice(0, 5).map((person, index) => (
              <li className={roundWinners.has(person.id) ? 'round-winner' : ''} key={person.id}>
                <b className="leaderboard-rank">{index + 1}</b>
                <span className={`leaderboard-avatar avatar-tone-${index % 6}`}>{person.avatar}</span>
                <span className="leaderboard-player"><strong>{person.nickname}</strong><small>{roundWinners.has(person.id) ? 'Won a chip this round' : (person.chips || 0) > 0 ? `${person.chips} correct ${person.chips === 1 ? 'estimate' : 'estimates'}` : 'No chips yet'}</small></span>
                <span className="leaderboard-chip-total"><i />{person.chips || 0}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="final-estimate">
        <div><span className="mini-label">Winning vote</span><h3>{isHost ? 'Which estimate takes the round?' : state.round.finalEstimate ? 'The host has picked a winner' : 'Waiting for the host'}</h3></div>
        {isHost ? (
          <div className="estimate-options">
            {CARDS.filter((card) => card !== '☕').map((card) => <button className={state.round.finalEstimate === card ? 'selected' : ''} key={card} onClick={() => { send('final_estimate', { value: card }); toast(`Winning estimate: ${card}`) }}>{card}</button>)}
          </div>
        ) : <span className={`winning-estimate-display ${state.round.finalEstimate ? 'selected' : ''}`}>{state.round.finalEstimate || '—'}</span>}
      </div>
    </section>
  )
}

export const AVATARS = ['🦊', '🐼', '🐯', '🦄', '🐸', '🐙', '🦁', '🐨', '🦦', '🐧', '🐲', '🦝', '🐵', '🐶', '🐱', '🐰', '🐻', '🐮', '🐷', '🐹', '🐺', '🦅', '🦉', '🐝', '🦋', '🐢', '🦖', '🦕', '👽', '🤖']
export const CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '∞', '☕']

export function parseAcceptanceCriteria(value) {
  let text = String(value || '')
    .replace(/\r/g, '')
    .replace(/[•●▪◦‣]/g, '\n')
    .replace(/[\t]+/g, ' ')

  // Jira and document exports sometimes flatten a list into one long line.
  text = text
    .replace(/\s+(?=(?:T?AC)\s*[-#:]?\s*\d+\s*(?:[:.)-]|\s))/gi, '\n')
    .replace(/\s+(?=\d{1,2}\s*[.)-]\s+)/g, '\n')

  const compact = text.trim()
  if (!compact.includes('\n') && /^1\s+\S/.test(compact) && /\s2\s+\S/.test(compact)) {
    text = compact.replace(/\s+(?=\d{1,2}\s+[A-Za-z])/g, '\n')
  } else if (!compact.includes('\n') && (compact.match(/;/g) || []).length >= 1) {
    text = compact.replace(/\s*;\s*/g, '\n')
  }

  return text
    .split('\n')
    .map((line) => line
      .trim()
      .replace(/^[-*–—]+\s*/, '')
      .replace(/^\[[ xX]\]\s*/, '')
      .replace(/^(?:T?AC)\s*[-#:]?\s*\d+\s*[:.)-]?\s*/i, '')
      .replace(/^\d{1,2}\s*[.)-]?\s+/, '')
      .replace(/[;,]\s*$/, '')
      .trim())
    .filter(Boolean)
    .filter((line, index, lines) => lines.findIndex((item) => item.toLowerCase() === line.toLowerCase()) === index)
    .slice(0, 20)
}

export function sessionKey(code) {
  return `pointpoker:room:${code.toUpperCase()}`
}

export function getSession(code) {
  try {
    const current = localStorage.getItem(sessionKey(code))
    const legacy = localStorage.getItem(`pointdeck:${code.toUpperCase()}`)
    const session = JSON.parse(current || legacy)
    if (!session || typeof session.playerId !== 'string' || typeof session.token !== 'string') return null
    if (session.playerId.length > 64 || session.token.length > 64) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(code, session) {
  localStorage.setItem(sessionKey(code), JSON.stringify(session))
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('accept', 'application/json')
  if (options.body != null && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong')
  return data
}

export function roomPath(code) {
  return `/room/${code.toUpperCase()}`
}

export function numericVote(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function getAnalytics(votes) {
  const revealed = Object.values(votes).filter((vote) => vote?.value)
  const numeric = revealed.map((vote) => numericVote(vote.value)).filter((vote) => vote !== null)
  const counts = revealed.reduce((result, vote) => {
    result[vote.value] = (result[vote.value] || 0) + 1
    return result
  }, {})
  const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const mode = sortedCounts.length && (sortedCounts.length === 1 || sortedCounts[0][1] > sortedCounts[1][1])
    ? sortedCounts[0][0]
    : '—'
  const average = numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null
  const spread = numeric.length ? Math.max(...numeric) - Math.min(...numeric) : null
  const confidence = revealed.length
    ? Math.round((revealed.reduce((sum, vote) => sum + ({ low: 1, medium: 2, high: 3 }[vote.confidence] || 2), 0) / (revealed.length * 3)) * 100)
    : 0

  return { revealed, counts, mode, average, spread, confidence }
}

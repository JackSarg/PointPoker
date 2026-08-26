import { AVATARS, parseAcceptanceCriteria } from '../src/lib.js'
import { readFile } from 'node:fs/promises'

const baseUrl = process.env.POINTPOKER_URL || 'http://localhost:5173'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`)
  return data
}

async function expectStatus(path, status, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  assert(response.status === status, `${path} should return ${status}, got ${response.status}`)
  return response
}

function waitForState(socket, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', onMessage)
      reject(new Error('Timed out waiting for room state'))
    }, timeoutMs)

    function onMessage(event) {
      const message = JSON.parse(String(event.data))
      if (message.type === 'state' && predicate(message.state)) {
        clearTimeout(timeout)
        socket.removeEventListener('message', onMessage)
        resolve(message.state)
      }
    }

    socket.addEventListener('message', onMessage)
  })
}

function waitForMessage(socket, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeEventListener('message', onMessage)
      reject(new Error('Timed out waiting for WebSocket message'))
    }, timeoutMs)

    function onMessage(event) {
      const message = JSON.parse(String(event.data))
      if (predicate(message)) {
        clearTimeout(timeout)
        socket.removeEventListener('message', onMessage)
        resolve(message)
      }
    }

    socket.addEventListener('message', onMessage)
  })
}

function sendAndWait(socket, message, predicate) {
  const waiting = waitForState(socket, predicate)
  socket.send(JSON.stringify(message))
  return waiting
}

const homeResponse = await fetch(baseUrl)
assert(homeResponse.ok, 'The public app shell should load')
const securityHeaderRules = await readFile(new URL('../public/_headers', import.meta.url), 'utf8')
assert(securityHeaderRules.includes('X-Content-Type-Options: nosniff'), 'Static asset rules should send nosniff')
assert(securityHeaderRules.includes("script-src 'self'"), 'Static asset rules should define a restrictive CSP')
if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) {
  assert(homeResponse.headers.get('x-content-type-options') === 'nosniff', 'The deployed app should send nosniff')
  assert(homeResponse.headers.get('content-security-policy')?.includes("script-src 'self'"), 'The deployed app should send its CSP')
}
await expectStatus('/api/rooms/NOT-A-CODE', 404)
await expectStatus('/api/rooms/ABC234/unknown', 404)
await expectStatus('/api/rooms', 405)
await expectStatus('/api/rooms', 415, { method: 'POST', body: '{}' })
await expectStatus('/api/rooms', 400, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })
await expectStatus('/api/rooms', 413, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'x'.repeat(17_000) }),
})
await expectStatus('/api/rooms', 403, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://attacker.example' },
  body: JSON.stringify({ name: 'Blocked', nickname: 'Blocked' }),
})

const quickRoom = await request('/api/rooms', {
  method: 'POST',
  body: JSON.stringify({ name: 'Quick-mode test', nickname: 'Host', avatar: '🦊', detailsEnabled: false }),
})
assert(quickRoom.state.detailsEnabled === false, 'New quick rooms should start with Jira details off')

const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:'
const url = new URL(baseUrl)
const socket = new WebSocket(
  `${wsProtocol}//${url.host}/api/rooms/${quickRoom.code}/ws`,
  'pointpoker-v1',
)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', () => reject(new Error('WebSocket failed to open')), { once: true })
})
socket.send(JSON.stringify({ type: 'authenticate', playerId: quickRoom.playerId, token: quickRoom.token }))

const guest = await request(`/api/rooms/${quickRoom.code}/join`, {
  method: 'POST',
  body: JSON.stringify({ nickname: 'Guest', avatar: '🐼' }),
})
const guestSocket = new WebSocket(
  `${wsProtocol}//${url.host}/api/rooms/${quickRoom.code}/ws`,
  'pointpoker-v1',
)
await new Promise((resolve, reject) => {
  guestSocket.addEventListener('open', resolve, { once: true })
  guestSocket.addEventListener('error', () => reject(new Error('Guest WebSocket failed to open')), { once: true })
})
guestSocket.send(JSON.stringify({ type: 'authenticate', playerId: guest.playerId, token: guest.token }))

assert(AVATARS.length === 30, 'The player-character roster should include 30 choices')
const targetedReactionPromise = waitForMessage(guestSocket, (message) => message.type === 'reaction' && message.value === '🚀')
socket.send(JSON.stringify({ type: 'reaction', value: '🚀', targetPlayerId: guest.playerId }))
const targetedReaction = await targetedReactionPromise
assert(targetedReaction.playerId === quickRoom.playerId && targetedReaction.targetPlayerId === guest.playerId, 'Targeted emoji reactions should identify both sender and recipient')

const transferredHost = await sendAndWait(socket, { type: 'transfer_host', targetPlayerId: guest.playerId }, (state) => state.hostId === guest.playerId)
assert(transferredHost.participants.find((person) => person.id === guest.playerId)?.isHost === true, 'Host transfer should crown the selected player')
assert(transferredHost.participants.find((person) => person.id === quickRoom.playerId)?.isHost === false, 'Host transfer should remove facilitator rights from the previous host')
const formerHostDenied = waitForMessage(socket, (message) => message.type === 'error')
socket.send(JSON.stringify({ type: 'start_round', durationMinutes: 0 }))
assert((await formerHostDenied).message === 'That action is not available right now.', 'The former host should immediately lose facilitator controls')
const restoredHost = await sendAndWait(guestSocket, { type: 'transfer_host', targetPlayerId: quickRoom.playerId }, (state) => state.hostId === quickRoom.playerId)
assert(restoredHost.participants.find((person) => person.id === quickRoom.playerId)?.isHost === true, 'The new host should be able to transfer the role again')

const unlimitedRound = await sendAndWait(socket, { type: 'start_round', durationMinutes: 0 }, (state) => state.round.status === 'voting')
assert(unlimitedRound.round.durationMinutes === 0, 'No-limit rounds should persist a zero duration')
await sendAndWait(socket, { type: 'vote', value: '5', confidence: 'medium' }, (state) => state.round.votes[quickRoom.playerId]?.value === '5')
await sendAndWait(socket, { type: 'reveal' }, (state) => state.round.status === 'revealed')
await sendAndWait(socket, { type: 'final_estimate', value: '5' }, (state) => state.round.finalEstimate === '5' && state.participants.find((person) => person.id === quickRoom.playerId)?.chips === 1)
const autoStartedRound = await sendAndWait(socket, { type: 'next_round', autoStart: true, durationMinutes: 0.5 }, (state) => state.round.number === 2 && state.round.status === 'voting')
assert(autoStartedRound.round.durationMinutes === 0.5, 'Thirty-second next rounds should auto-start')
assert(autoStartedRound.history.length === 1 && !('votes' in autoStartedRound.history[0]), 'Completed history should not expose individual votes')
await sendAndWait(socket, { type: 'vote', value: '8', confidence: 'high' }, (state) => state.round.votes[quickRoom.playerId]?.value === '8')
await sendAndWait(guestSocket, { type: 'vote', value: '5', confidence: 'medium' }, (state) => state.round.votes[guest.playerId]?.value === '5')
await sendAndWait(socket, { type: 'reveal' }, (state) => state.round.status === 'revealed')
const hostWins = await sendAndWait(socket, { type: 'final_estimate', value: '8' }, (state) => state.round.finalEstimate === '8' && state.participants.find((person) => person.id === quickRoom.playerId)?.chips === 2)
assert(hostWins.participants.find((person) => person.id === guest.playerId)?.chips === 0, 'Only matching voters should earn a chip')
const guestWins = await sendAndWait(socket, { type: 'final_estimate', value: '5' }, (state) => state.round.finalEstimate === '5' && state.participants.find((person) => person.id === guest.playerId)?.chips === 1)
assert(guestWins.participants.find((person) => person.id === quickRoom.playerId)?.chips === 1, 'Changing the winner should preserve chips from completed rounds')
await sendAndWait(socket, { type: 'final_estimate', value: '8' }, (state) => state.round.finalEstimate === '8' && state.participants.find((person) => person.id === quickRoom.playerId)?.chips === 2)
const revoteState = await sendAndWait(socket, { type: 'revote', durationMinutes: 1 }, (state) => state.round.status === 'voting' && Object.keys(state.round.votes).length === 0)
assert(revoteState.round.number === 2 && revoteState.round.durationMinutes === 1, 'Revote should restart the same story with the selected timer')
assert(revoteState.participants.find((person) => person.id === quickRoom.playerId)?.chips === 1 && revoteState.participants.find((person) => person.id === guest.playerId)?.chips === 0, 'Revote should only revoke chips from the unfinished round')

await sendAndWait(socket, { type: 'toggle_details', enabled: true }, (state) => state.detailsEnabled === true)

const criteria = parseAcceptanceCriteria('AC1: Customer can sign in AC2: Fallback is shown TAC3: Login is audited')
assert(criteria.length === 3, 'Flattened AC labels should split into three criteria')
const savedStory = await sendAndWait(socket, {
  type: 'update_story',
  story: { key: 'WEB-248', title: 'Passkey authentication', description: 'Test story', criteria },
}, (state) => state.story.criteria.length === 3)
assert(savedStory.story.criteria[1] === 'Fallback is shown', 'Cleaned criteria should persist in order')

const detailedRoom = await request('/api/rooms', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Detailed-mode test',
    nickname: 'Host',
    avatar: '🐼',
    detailsEnabled: true,
    story: {
      key: 'WEB-901',
      title: 'Create-room Jira setup',
      description: 'Story context supplied before the room opens.',
      criteria: ['The story is visible in round one', 'Acceptance criteria keep their order'],
    },
  }),
})
assert(detailedRoom.state.detailsEnabled === true, 'Detailed rooms should honour the creation switch')
assert(detailedRoom.state.story.key === 'WEB-901' && detailedRoom.state.story.criteria.length === 2, 'Jira details supplied during creation should be ready in round one')

socket.close(1000, 'Test complete')
guestSocket.close(1000, 'Test complete')
console.log('Integration checks passed: security headers, input bounds, route and origin validation, private history, room modes, avatars, host transfer, emoji targeting, AC parsing, timers, chip scoring, winner changes, and revote.')

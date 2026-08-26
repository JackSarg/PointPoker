/* global WebSocketPair, WebSocketRequestResponsePair */
import { DurableObject } from 'cloudflare:workers'

const CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '∞', '☕']
const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/
const WEBSOCKET_PROTOCOL = 'pointpoker-v1'
const MAX_PARTICIPANTS = 30
const MAX_JSON_CHARACTERS = 16_384
const MAX_WEBSOCKET_BYTES = 4_096
const MESSAGE_RATE_WINDOW_MS = 10_000
const MAX_MESSAGES_PER_WINDOW = 80
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1_000
const API_SECURITY_HEADERS = {
  'cache-control': 'no-store',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'cross-origin-resource-policy': 'same-origin',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
}

const json = (value, init = {}) =>
  Response.json(value, { ...init, headers: { ...API_SECURITY_HEADERS, ...(init.headers || {}) } })

const cleanText = (value, max = 120) => String(value || '')
  .normalize('NFKC')
  .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max)

function trustedBrowserOrigin(request) {
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return { response: json({ error: 'Expected a JSON request body.' }, { status: 415 }) }
  }

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (declaredLength > MAX_JSON_CHARACTERS * 4) {
    return { response: json({ error: 'Request body is too large.' }, { status: 413 }) }
  }

  let text
  try {
    text = await request.text()
  } catch {
    return { response: json({ error: 'Request body could not be read.' }, { status: 400 }) }
  }
  if (!text || text.length > MAX_JSON_CHARACTERS) {
    return { response: json({ error: text ? 'Request body is too large.' : 'Request body is required.' }, { status: text ? 413 : 400 }) }
  }

  try {
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
    return { value }
  } catch {
    return { response: json({ error: 'Request body is not valid JSON.' }, { status: 400 }) }
  }
}

function supportsWebSocketProtocol(request) {
  const protocols = (request.headers.get('sec-websocket-protocol') || '')
    .split(',')
    .map((value) => value.trim())
  return protocols.includes(WEBSOCKET_PROTOCOL)
}

function cleanEmoji(value) {
  const emoji = String(value || '').trim()
  if (!emoji || [...emoji].length > 16 || emoji.length > 64) return ''
  const residue = emoji.replace(new RegExp('\\p{Emoji}|\\p{Emoji_Modifier}|\\u200d|\\ufe0f|\\u20e3', 'gu'), '')
  return residue ? '' : emoji
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

function newPlayer(nickname, avatar, isHost = false) {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    nickname: cleanText(nickname, 28) || 'Anonymous',
    avatar: cleanText(avatar, 8) || '🦊',
    isHost,
    online: false,
    readiness: null,
    chips: 0,
    joinedAt: Date.now(),
  }
}

export class PokerRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.state = null

    this.ctx.getWebSockets().forEach((socket) => {
      const attachment = socket.deserializeAttachment()
      if (attachment) socket.serializeAttachment(attachment)
    })

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'))
  }

  async load() {
    if (!this.state) this.state = await this.ctx.storage.get('room')
    if (this.state) {
      this.state.participants.forEach((person) => {
        if (!Number.isFinite(person.chips)) person.chips = 0
      })
      if (!Array.isArray(this.state.round.awardedPlayerIds)) this.state.round.awardedPlayerIds = []
      if (!Number.isFinite(this.state.expiresAt)) await this.save()
    }
    return this.state
  }

  async save() {
    if (!this.state) return
    const now = Date.now()
    this.state.updatedAt = now
    this.state.expiresAt = now + ROOM_TTL_MS
    await this.ctx.storage.put('room', this.state)
    await this.ctx.storage.setAlarm(this.state.expiresAt)
  }

  async alarm() {
    await this.load()
    if (!this.state) return

    if (Number.isFinite(this.state.expiresAt) && this.state.expiresAt > Date.now()) {
      await this.ctx.storage.setAlarm(this.state.expiresAt)
      return
    }

    const hasActiveParticipants = this.ctx.getWebSockets().some((socket) =>
      socket.readyState === WebSocket.OPEN && socket.deserializeAttachment()?.playerId,
    )
    if (hasActiveParticipants) {
      await this.save()
      return
    }

    for (const socket of this.ctx.getWebSockets()) {
      try { socket.close(1001, 'Room expired') } catch { /* already closed */ }
    }
    this.state = null
    await this.ctx.storage.deleteAll()
  }

  participant(playerId, token) {
    return this.state?.participants.find((person) => person.id === playerId && person.token === token)
  }

  withinMessageLimit(socket) {
    const attachment = socket.deserializeAttachment() || {}
    const now = Date.now()
    if (!attachment.messageWindowStartedAt || now - attachment.messageWindowStartedAt >= MESSAGE_RATE_WINDOW_MS) {
      attachment.messageWindowStartedAt = now
      attachment.messageCount = 0
    }
    attachment.messageCount = (attachment.messageCount || 0) + 1
    socket.serializeAttachment(attachment)
    return attachment.messageCount <= MAX_MESSAGES_PER_WINDOW
  }

  clearRoundAwards(round) {
    for (const playerId of round.awardedPlayerIds || []) {
      const winner = this.state.participants.find((person) => person.id === playerId)
      if (winner) winner.chips = Math.max(0, (winner.chips || 0) - 1)
    }
    round.awardedPlayerIds = []
  }

  awardRound(round, winningValue) {
    this.clearRoundAwards(round)
    round.finalEstimate = winningValue
    if (!winningValue) return

    round.awardedPlayerIds = Object.entries(round.votes)
      .filter(([, vote]) => vote.value === winningValue)
      .map(([playerId]) => playerId)

    for (const playerId of round.awardedPlayerIds) {
      const winner = this.state.participants.find((person) => person.id === playerId)
      if (winner) winner.chips = (winner.chips || 0) + 1
    }
  }

  publicState(viewerId = '') {
    const room = this.state
    const revealed = room.round.status === 'revealed'
    const votes = Object.fromEntries(
      Object.entries(room.round.votes).map(([playerId, vote]) => [
        playerId,
        revealed || playerId === viewerId
          ? { voted: true, value: vote.value, confidence: vote.confidence }
          : { voted: true, value: null, confidence: null },
      ]),
    )

    return {
      code: room.code,
      name: room.name,
      detailsEnabled: room.detailsEnabled ?? true,
      hostId: room.hostId,
      participants: room.participants.map(({ token: _token, ...person }) => person),
      story: room.story,
      round: { ...room.round, votes },
      history: room.history.map((item) => ({
        roundNumber: item.roundNumber,
        story: item.story,
        finalEstimate: item.finalEstimate,
        completedAt: item.completedAt,
      })),
    }
  }

  sendState(socket) {
    const attachment = socket.deserializeAttachment() || {}
    if (!attachment.playerId) return
    socket.send(JSON.stringify({ type: 'state', state: this.publicState(attachment.playerId) }))
  }

  broadcastState() {
    for (const socket of this.ctx.getWebSockets()) {
      try {
        this.sendState(socket)
      } catch {
        // The close handler will clean up stale connections.
      }
    }
  }

  broadcast(message) {
    const payload = JSON.stringify(message)
    for (const socket of this.ctx.getWebSockets()) {
      try {
        if (!socket.deserializeAttachment()?.playerId) continue
        socket.send(payload)
      } catch {
        // Ignore a socket that closed between enumeration and send.
      }
    }
  }

  async fetch(request) {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()
    const state = await this.load()

    if (url.pathname.endsWith('/create') && method === 'POST') {
      if (state) return json({ error: 'Room already exists' }, { status: 409 })
      const parsed = await readJson(request)
      if (parsed.response) return parsed.response
      const body = parsed.value
      const code = cleanText(body.code, 8).toUpperCase()
      const name = cleanText(body.name, 48)
      const nickname = cleanText(body.nickname, 28)
      if (!ROOM_CODE_PATTERN.test(code)) return json({ error: 'Invalid room code.' }, { status: 400 })
      if (!name || !nickname) return json({ error: 'A room name and nickname are required.' }, { status: 400 })
      const host = newPlayer(nickname, body.avatar, true)
      const detailsEnabled = Boolean(body.detailsEnabled)
      const story = body.story || {}
      this.state = {
        code,
        name,
        detailsEnabled,
        createdAt: Date.now(),
        hostId: host.id,
        participants: [host],
        story: detailsEnabled ? {
          key: cleanText(story.key, 24),
          title: cleanText(story.title, 140),
          description: cleanText(story.description, 700),
          criteria: Array.isArray(story.criteria)
            ? story.criteria.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 20)
            : [],
        } : { key: '', title: '', description: '', criteria: [] },
        round: {
          number: 1,
          status: 'lobby',
          votes: {},
          startedAt: null,
          durationMinutes: 5,
          finalEstimate: null,
          awardedPlayerIds: [],
        },
        history: [],
      }
      await this.save()
      return json({
        code: this.state.code,
        playerId: host.id,
        token: host.token,
        state: this.publicState(host.id),
      })
    }

    if (!state) return json({ error: 'Room not found' }, { status: 404 })

    if (url.pathname.endsWith('/meta') && method === 'GET') {
      return json({
        code: state.code,
        name: state.name,
        participantCount: state.participants.length,
        avatars: state.participants.slice(0, 5).map((person) => person.avatar),
      })
    }

    if (url.pathname.endsWith('/join') && method === 'POST') {
      if (this.state.participants.length >= MAX_PARTICIPANTS) {
        return json({ error: 'This room is full.' }, { status: 409 })
      }
      const parsed = await readJson(request)
      if (parsed.response) return parsed.response
      const body = parsed.value
      const nickname = cleanText(body.nickname, 28)
      if (!nickname) return json({ error: 'Choose a nickname to join' }, { status: 400 })
      const person = newPlayer(nickname, body.avatar)
      this.state.participants.push(person)
      await this.save()
      this.broadcastState()
      return json({ playerId: person.id, token: person.token, state: this.publicState(person.id) })
    }

    if (url.pathname.endsWith('/ws') && method === 'GET') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return new Response('Expected a WebSocket upgrade', { status: 426 })
      }
      if (!trustedBrowserOrigin(request)) return json({ error: 'Origin not allowed.' }, { status: 403 })
      if (!supportsWebSocketProtocol(request)) return json({ error: 'Unsupported WebSocket protocol.' }, { status: 400 })

      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      this.ctx.acceptWebSocket(server)
      server.serializeAttachment({ playerId: null, messageWindowStartedAt: Date.now(), messageCount: 0 })
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: { 'sec-websocket-protocol': WEBSOCKET_PROTOCOL },
      })
    }

    return json({ error: 'Not found' }, { status: 404 })
  }

  async webSocketMessage(socket, rawMessage) {
    await this.load()
    if (!this.state) {
      socket.close(1001, 'Room expired')
      return
    }
    const messageBytes = typeof rawMessage === 'string'
      ? new TextEncoder().encode(rawMessage).byteLength
      : rawMessage.byteLength
    if (messageBytes > MAX_WEBSOCKET_BYTES) {
      socket.close(1009, 'Message too large')
      return
    }
    if (!this.withinMessageLimit(socket)) {
      socket.send(JSON.stringify({ type: 'error', message: 'Too many actions. Please slow down for a moment.' }))
      return
    }

    let message
    try {
      message = JSON.parse(typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage))
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('invalid')
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'That action could not be understood.' }))
      return
    }

    const attachment = socket.deserializeAttachment() || {}
    if (!attachment.playerId) {
      if (message.type !== 'authenticate') {
        socket.close(1008, 'Authentication required')
        return
      }
      const playerId = cleanText(message.playerId, 64)
      const token = cleanText(message.token, 64)
      const authenticatedPlayer = this.participant(playerId, token)
      if (!authenticatedPlayer) {
        socket.close(1008, 'Session expired')
        return
      }
      attachment.playerId = authenticatedPlayer.id
      socket.serializeAttachment(attachment)
      authenticatedPlayer.online = true
      await this.save()
      this.sendState(socket)
      this.broadcastState()
      return
    }

    const person = this.state.participants.find((item) => item.id === attachment.playerId)
    if (!person) {
      socket.close(1008, 'Session expired')
      return
    }

    const isHost = person.id === this.state.hostId
    const round = this.state.round
    const requestedDuration = [0, 0.5, 1, 3, 5, 8].includes(Number(message.durationMinutes))
      ? Number(message.durationMinutes)
      : round.durationMinutes

    if (message.type === 'vote' && round.status === 'voting' && CARDS.includes(message.value)) {
      round.votes[person.id] = {
        voted: true,
        value: message.value,
        confidence: ['low', 'medium', 'high'].includes(message.confidence) ? message.confidence : 'medium',
      }
    } else if (message.type === 'readiness' && ['ready', 'question'].includes(message.value)) {
      person.readiness = message.value
    } else if (message.type === 'reaction') {
      const emoji = cleanEmoji(message.value)
      const requestedTargetId = cleanText(message.targetPlayerId, 64)
      const target = requestedTargetId ? this.state.participants.find((item) => item.id === requestedTargetId) : null
      if (!emoji || (requestedTargetId && !target)) {
        socket.send(JSON.stringify({ type: 'error', message: 'That reaction could not be sent.' }))
        return
      }
      this.broadcast({ type: 'reaction', value: emoji, playerId: person.id, targetPlayerId: target?.id || null, id: crypto.randomUUID() })
      return
    } else if (message.type === 'transfer_host' && isHost) {
      const targetPlayerId = cleanText(message.targetPlayerId, 64)
      const nextHost = this.state.participants.find((item) => item.id === targetPlayerId)
      if (!nextHost || nextHost.id === person.id || !nextHost.online) {
        socket.send(JSON.stringify({ type: 'error', message: 'Choose another online player to make host.' }))
        return
      }
      this.state.hostId = nextHost.id
      this.state.participants.forEach((item) => { item.isHost = item.id === nextHost.id })
      await this.save()
      this.broadcast({ type: 'host_transferred', playerId: nextHost.id, nickname: nextHost.nickname })
      this.broadcastState()
      return
    } else if (message.type === 'kick_player' && isHost) {
      const targetPlayerId = cleanText(message.targetPlayerId, 64)
      const removedPlayer = this.state.participants.find((item) => item.id === targetPlayerId)
      if (!removedPlayer || removedPlayer.id === person.id || removedPlayer.id === this.state.hostId) {
        socket.send(JSON.stringify({ type: 'error', message: 'Choose another player to remove.' }))
        return
      }

      this.state.participants = this.state.participants.filter((item) => item.id !== removedPlayer.id)
      delete round.votes[removedPlayer.id]
      round.awardedPlayerIds = (round.awardedPlayerIds || []).filter((playerId) => playerId !== removedPlayer.id)
      await this.save()

      for (const playerSocket of this.ctx.getWebSockets()) {
        if (playerSocket.deserializeAttachment()?.playerId !== removedPlayer.id) continue
        try { playerSocket.send(JSON.stringify({ type: 'removed', message: 'The host removed you from this room.' })) } catch { /* already closed */ }
        try { playerSocket.close(1008, 'Removed by host') } catch { /* already closed */ }
      }

      this.broadcast({ type: 'player_removed', playerId: removedPlayer.id, nickname: removedPlayer.nickname })
      this.broadcastState()
      return
    } else if (message.type === 'start_round' && isHost) {
      this.clearRoundAwards(round)
      round.status = 'voting'
      round.votes = {}
      round.startedAt = Date.now()
      round.finalEstimate = null
      round.durationMinutes = requestedDuration
      this.state.participants.forEach((item) => { item.readiness = null })
    } else if (message.type === 'reveal' && isHost && round.status === 'voting') {
      round.status = 'revealed'
    } else if (message.type === 'final_estimate' && isHost && round.status === 'revealed') {
      this.awardRound(round, CARDS.filter((card) => card !== '☕').includes(message.value) ? message.value : null)
    } else if (message.type === 'revote' && isHost && round.status === 'revealed') {
      this.clearRoundAwards(round)
      round.status = 'voting'
      round.votes = {}
      round.startedAt = Date.now()
      round.durationMinutes = requestedDuration
      round.finalEstimate = null
      this.state.participants.forEach((item) => { item.readiness = null })
    } else if (message.type === 'next_round' && isHost) {
      if (round.status === 'revealed' && !round.finalEstimate) {
        socket.send(JSON.stringify({ type: 'error', message: 'Choose the winning estimate before starting the next round.' }))
        return
      }
      if (round.status === 'revealed') {
        this.state.history.unshift({
          roundNumber: round.number,
          story: { ...this.state.story },
          finalEstimate: round.finalEstimate,
          completedAt: Date.now(),
        })
        this.state.history = this.state.history.slice(0, 30)
      }
      this.state.round = {
        number: round.number + 1,
        status: message.autoStart ? 'voting' : 'lobby',
        votes: {},
        startedAt: message.autoStart ? Date.now() : null,
        durationMinutes: requestedDuration,
        finalEstimate: null,
        awardedPlayerIds: [],
      }
      this.state.participants.forEach((item) => { item.readiness = null })
    } else if (message.type === 'update_story' && isHost) {
      const story = message.story || {}
      this.state.story = {
        key: cleanText(story.key, 24),
        title: cleanText(story.title, 140) || 'Untitled story',
        description: cleanText(story.description, 700),
        criteria: Array.isArray(story.criteria)
          ? story.criteria.map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 20)
          : [],
      }
    } else if (message.type === 'toggle_details' && isHost && typeof message.enabled === 'boolean') {
      this.state.detailsEnabled = message.enabled
    } else {
      socket.send(JSON.stringify({ type: 'error', message: 'That action is not available right now.' }))
      return
    }

    await this.save()
    this.broadcastState()
  }

  async webSocketClose(socket, code, reason) {
    await this.load()
    const attachment = socket.deserializeAttachment() || {}
    try { socket.close(code, reason) } catch { /* already closed */ }

    const stillConnected = this.ctx.getWebSockets().some((candidate) => {
      if (candidate === socket || candidate.readyState !== WebSocket.OPEN) return false
      return candidate.deserializeAttachment()?.playerId === attachment.playerId
    })
    if (!stillConnected) {
      const person = this.state?.participants.find((item) => item.id === attachment.playerId)
      if (person) {
        person.online = false
        await this.save()
        this.broadcastState()
      }
    }
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket, 1011, 'Connection error')
  }
}

async function withinRateLimit(limiter, key) {
  if (!limiter) return true
  try {
    return (await limiter.limit({ key })).success
  } catch {
    return true
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const segments = url.pathname.split('/').filter(Boolean)
    const isApiRequest = segments[0] === 'api'

    if (!isApiRequest) return json({ error: 'Not found' }, { status: 404 })
    if (!trustedBrowserOrigin(request)) return json({ error: 'Origin not allowed.' }, { status: 403 })

    const clientKey = request.headers.get('cf-connecting-ip') || 'local-development'
    if (!await withinRateLimit(env.API_RATE_LIMITER, clientKey)) {
      return json({ error: 'Too many requests. Please wait a minute and try again.' }, {
        status: 429,
        headers: { 'retry-after': '60' },
      })
    }

    if (url.pathname === '/api/rooms') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, { status: 405, headers: { allow: 'POST' } })
      }
      if (!await withinRateLimit(env.CREATE_ROOM_RATE_LIMITER, clientKey)) {
        return json({ error: 'Too many rooms created. Please wait a minute and try again.' }, {
          status: 429,
          headers: { 'retry-after': '60' },
        })
      }

      const parsed = await readJson(request)
      if (parsed.response) return parsed.response
      const body = parsed.value
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = roomCode()
        const id = env.POKER_ROOMS.idFromName(code)
        const response = await env.POKER_ROOMS.get(id).fetch(new Request(`${url.origin}/create`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...body, code }),
        }))
        if (response.ok) return response
        if (response.status !== 409) return response
      }
      return json({ error: 'Could not create a unique room. Please try again.' }, { status: 503 })
    }

    if (segments[1] === 'rooms' && segments[2] && segments.length <= 4) {
      const code = segments[2].toUpperCase()
      const action = segments[3] || 'meta'
      const allowedMethod = { meta: 'GET', join: 'POST', ws: 'GET' }[action]
      if (!ROOM_CODE_PATTERN.test(code) || !allowedMethod) return json({ error: 'Room not found' }, { status: 404 })
      if (request.method !== allowedMethod) {
        return json({ error: 'Method not allowed.' }, { status: 405, headers: { allow: allowedMethod } })
      }
      const id = env.POKER_ROOMS.idFromName(code)
      const destination = new URL(request.url)
      destination.pathname = `/${action}`
      destination.search = ''
      return env.POKER_ROOMS.get(id).fetch(new Request(destination, request))
    }

    return json({ error: 'Not found' }, { status: 404 })
  },
}

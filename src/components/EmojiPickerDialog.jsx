import { lazy, Suspense, useEffect } from 'react'
import { SmilePlus, X } from 'lucide-react'

const EmojiPicker = lazy(() => import('emoji-picker-react'))

export default function EmojiPickerDialog({ open, onClose, onSelect, recent, theme, targetNickname }) {
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  const pick = (emoji) => {
    onSelect(emoji)
    onClose()
  }

  return (
    <div className="emoji-dialog-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="emoji-dialog" role="dialog" aria-modal="true" aria-label={targetNickname ? `Throw an emoji at ${targetNickname}` : 'Choose a reaction'}>
        <header className="emoji-dialog-header">
          <span className="emoji-dialog-icon"><SmilePlus size={18} /></span>
          <div>
            <strong>{targetNickname ? `Throw one at ${targetNickname}` : 'React to the table'}</strong>
            <small>Pick a recent emoji or search the whole library.</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Close emoji picker"><X size={17} /></button>
        </header>
        <div className="emoji-recent-row">
          <span>Recent</span>
          {recent.map((emoji) => <button type="button" key={emoji} onClick={() => pick(emoji)} aria-label={`React with ${emoji}`}>{emoji}</button>)}
        </div>
        <Suspense fallback={<div className="emoji-picker-loading">Loading emoji library…</div>}>
          <EmojiPicker
            autoFocusSearch={false}
            emojiStyle="native"
            height={360}
            lazyLoadEmojis
            onEmojiClick={(emojiData) => pick(emojiData.emoji)}
            previewConfig={{ showPreview: false }}
            searchPlaceholder="Search all emojis"
            suggestedEmojisMode="recent"
            theme={theme === 'dark' ? 'dark' : 'light'}
            width="100%"
          />
        </Suspense>
      </section>
    </div>
  )
}

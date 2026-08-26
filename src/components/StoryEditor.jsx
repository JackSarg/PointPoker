import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardPaste, ListChecks, Sparkles, X } from 'lucide-react'
import { parseAcceptanceCriteria } from '../lib'

const DEFAULT_STORY_TITLE = 'Add the first story to the table'
const DEFAULT_STORY_DESCRIPTION = 'Give the team enough context to estimate complexity, effort and uncertainty.'

export default function StoryEditor({ story, onClose, onSave }) {
  const [draft, setDraft] = useState({
    ...story,
    title: story.title === DEFAULT_STORY_TITLE ? '' : story.title,
    description: story.description === DEFAULT_STORY_DESCRIPTION ? '' : story.description,
  })
  const [criteriaText, setCriteriaText] = useState((story.criteria || []).join('\n'))
  const parsedCriteria = useMemo(() => parseAcceptanceCriteria(criteriaText), [criteriaText])

  useEffect(() => {
    const close = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="modal-scrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="story-modal" onSubmit={(event) => { event.preventDefault(); onSave({ ...draft, criteria: parsedCriteria }) }}>
        <div className="modal-header">
          <div><span className="mini-label">Story context</span><h2>Set the table</h2><p>Clarity now makes the estimate worth discussing.</p></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </div>
        <div className="story-form-grid">
          <label className="field-label compact">Issue key<input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.toUpperCase() })} placeholder="WEB-248" maxLength={24} /></label>
          <label className="field-label title-field">Story title<input autoFocus required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={DEFAULT_STORY_TITLE} maxLength={140} /></label>
        </div>
        <label className="field-label">Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={DEFAULT_STORY_DESCRIPTION} rows={4} maxLength={700} /></label>
        <fieldset className="criteria-fieldset">
          <div className="criteria-heading">
            <div><legend>Acceptance criteria</legend><p>Paste them exactly as they appear in Jira. We’ll clean up the formatting.</p></div>
            <span><ClipboardPaste size={14} /> Paste friendly</span>
          </div>
          <div className="criteria-paste-box">
            <ClipboardPaste size={18} />
            <textarea
              aria-label="Acceptance criteria"
              value={criteriaText}
              onChange={(event) => setCriteriaText(event.target.value)}
              placeholder={'Paste bullets, numbered steps or AC labels…\n\n• Customer can register a passkey\n• Unsupported devices see a fallback'}
              rows={7}
            />
          </div>
          {parsedCriteria.length > 0 ? (
            <div className="criteria-preview">
              <div><span><ListChecks size={14} /> {parsedCriteria.length} {parsedCriteria.length === 1 ? 'criterion' : 'criteria'} detected</span><small><Sparkles size={12} /> Formatting cleaned automatically</small></div>
              <ol>{parsedCriteria.map((criterion, index) => <li key={`${criterion}-${index}`}><span>{index + 1}</span><p>{criterion}</p></li>)}</ol>
            </div>
          ) : (
            <p className="criteria-empty"><Sparkles size={12} /> Try bullets, `AC1`, `TAC1`, `1.` or one criterion per line.</p>
          )}
        </fieldset>
        <div className="modal-actions"><button className="button ghost dark" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save story <Check size={17} /></button></div>
      </form>
    </div>
  )
}

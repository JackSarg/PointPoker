import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, TimerReset } from 'lucide-react'

const TIMER_OPTIONS = [
  { value: 0, label: 'No limit' },
  { value: 0.5, label: '30 sec' },
  { value: 1, label: '1 min' },
  { value: 3, label: '3 min' },
  { value: 5, label: '5 min' },
  { value: 8, label: '8 min' },
]

export default function TimerSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = TIMER_OPTIONS.find((option) => option.value === value) || TIMER_OPTIONS[0]

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (event.key === 'Escape' || !rootRef.current?.contains(event.target)) setOpen(false)
    }
    window.addEventListener('keydown', close)
    window.addEventListener('mousedown', close)
    return () => {
      window.removeEventListener('keydown', close)
      window.removeEventListener('mousedown', close)
    }
  }, [open])

  return (
    <div className={`table-timer-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      <button type="button" role="combobox" aria-label={`Round timer: ${selected.label}`} aria-expanded={open} aria-controls="round-timer-options" onClick={() => setOpen((current) => !current)}>
        <TimerReset size={14} /><span>{selected.label}</span><ChevronDown size={13} />
      </button>
      {open && (
        <div className="table-timer-options" id="round-timer-options" role="listbox" aria-label="Round timer">
          {TIMER_OPTIONS.map((option) => (
            <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }}>
              <span>{option.label}</span>{option.value === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

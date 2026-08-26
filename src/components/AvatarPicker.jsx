import { Check } from 'lucide-react'
import { AVATARS } from '../lib'

export default function AvatarPicker({ value, onChange, label = 'Choose your player' }) {
  return (
    <fieldset className="avatar-fieldset">
      <legend>{label}</legend>
      <div className="avatar-grid">
        {AVATARS.map((avatar, index) => (
          <button
            className={`avatar-option avatar-tone-${index % 6} ${value === avatar ? 'is-selected' : ''}`}
            key={avatar}
            type="button"
            aria-label={`Choose ${avatar}`}
            aria-pressed={value === avatar}
            onClick={() => onChange(avatar)}
          >
            <span>{avatar}</span>
            {value === avatar && <i><Check size={11} strokeWidth={3} /></i>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

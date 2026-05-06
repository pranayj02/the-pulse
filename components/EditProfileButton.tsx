"use client"
import { useState } from 'react'
import { Settings, X, Check, Loader2 } from 'lucide-react'

type Props = {
  initialName: string | null
  initialUsername: string | null
  initialCity: string | null
  initialBio: string | null
}

export function EditProfileButton({ initialName, initialUsername, initialCity, initialBio }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName ?? '')
  const [username, setUsername] = useState(initialUsername ?? '')
  const [city, setCity] = useState(initialCity ?? '')
  const [bio, setBio] = useState(initialBio ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: name || null,
          username: username || null,
          city: city || null,
          bio: bio || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
      } else {
        setSaved(true)
        setTimeout(() => {
          setOpen(false)
          setSaved(false)
          window.location.reload()
        }, 800)
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button className="cta-secondary" onClick={() => setOpen(true)}>
        <Settings size={16} />
        <span>Edit profile</span>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 0 env(safe-area-inset-bottom)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px 32px',
            width: '100%', maxWidth: 480,
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>Edit profile</h2>
              <button onClick={() => setOpen(false)} style={{ color: 'var(--color-text-muted)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Fields */}
            {[
              { label: 'DISPLAY NAME', value: name, set: setName, placeholder: 'Your name', maxLength: 80 },
              { label: 'USERNAME', value: username, set: setUsername, placeholder: 'lowercase_no_spaces', maxLength: 30 },
              { label: 'CITY', value: city, set: setCity, placeholder: 'Mumbai', maxLength: 60 },
            ].map(({ label, value, set, placeholder, maxLength }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                  {label}
                </label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  style={{
                    background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
                    borderRadius: 10, padding: '10px 14px', fontSize: 15,
                    color: 'var(--color-text)', outline: 'none', width: '100%',
                  }}
                />
              </div>
            ))}

            {/* Bio */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                BIO
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What's your taste like?"
                maxLength={200}
                rows={3}
                style={{
                  background: 'var(--color-surface-offset)', border: '1px solid var(--color-border)',
                  borderRadius: 10, padding: '10px 14px', fontSize: 15,
                  color: 'var(--color-text)', outline: 'none', width: '100%',
                  resize: 'none', fontFamily: 'inherit',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'right' }}>
                {bio.length}/200
              </span>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: 'var(--color-notification)', margin: 0 }}>{error}</p>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                background: saved ? 'var(--color-success)' : 'var(--color-accent, #f5c542)',
                color: saved ? '#fff' : '#000',
                border: 'none', borderRadius: 12, padding: '13px',
                fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> :
               saved ? <><Check size={18} /> Saved!</> : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

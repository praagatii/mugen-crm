import { useState, useEffect } from 'react'

const LS_KEY = 'mugen_crm_api_key'

function loadKey() {
  return localStorage.getItem(LS_KEY) || ''
}

function saveKeyLocally(key) {
  if (key) localStorage.setItem(LS_KEY, key)
  else localStorage.removeItem(LS_KEY)
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [toast, setToast] = useState(null)

  const show = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setHasKey(!!d.apiKey)).catch(() => {})
  }, [])

  const handleSave = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey }),
      })
      saveKeyLocally(apiKey)
      setSaved(true); setHasKey(true); show('SETTINGS SAVED')
      setTimeout(() => setSaved(false), 2000)
    } catch {
      saveKeyLocally(apiKey)
      setSaved(true); setHasKey(true); show('SAVED LOCALLY')
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="page-container" style={{maxWidth:"720px"}}>
      <div className="section-title" style={{marginBottom:"32px"}}>SETTINGS</div>

      <div className="tile">
        <div style={{marginBottom:"24px"}}>
          <span className="tile-label" style={{fontSize:"10px", marginBottom:"12px"}}>AI API KEY</span>
          <input className="input" type="password" placeholder="sk-or-..." value={apiKey} onChange={e => setApiKey(e.target.value)}
            style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"12px", background:"#202020", border:"1px solid #2a2a2a", borderRadius:"4px", padding:"10px 12px", color:"#ffffff", width:"100%", outline:"none"}} />
          <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563", marginTop:"10px", lineHeight:1.5}}>
            Used for AI name cleaning, opportunity scoring, and outreach message generation.
          </p>
        </div>

        <button onClick={handleSave} className="btn" style={{width:"100%", padding:"10px 20px", fontSize:"11px"}}>
          {saved ? 'SAVED' : hasKey ? 'UPDATE KEY' : 'SAVE KEY'}
        </button>

        {hasKey && (
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"6px", marginTop:"16px"}}>
            <span style={{width:"5px", height:"5px", borderRadius:"50%", background:"#7C89B0", display:"inline-block"}} />
            <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>API KEY CONFIGURED</span>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position:"fixed", bottom:"24px", right:"24px", zIndex:100,
          padding:"12px 20px", borderRadius:"4px",
          fontFamily:"IBM Plex Mono,monospace", fontSize:"10px",
          letterSpacing:"0.02em",
          background:"#202020", color:"#ffffff",
          border:"1px solid #2a2a2a",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { getLeads, toggleStatus, updateNotes, tidyLeads, generateMessages, scoreLeads, deleteAllLeads } from '../services/api.js'

function cleanPhone(p) {
  if (!p) return ''
  const d = p.replace(/\D/g, '')
  if (d.length === 10) return '91' + d
  if (d.length === 12 && d.startsWith('91')) return d
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1)
  return d
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reachFilter, setReachFilter] = useState('all')
  const [notePanel, setNotePanel] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [messages, setMessages] = useState({})
  const [showQueue, setShowQueue] = useState(false)
  const [toast, setToast] = useState(null)

  const show = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (reachFilter === 'reached') params.filterReached = true
      else if (reachFilter === 'unreached') params.filterReached = false
      setLeads(await getLeads(params))
    } catch { setLeads([]) }
    finally { setLoading(false) }
  }, [search, reachFilter])

  useEffect(() => { fetch() }, [fetch])

  const handleToggle = async (id) => {
    try { const u = await toggleStatus(id); setLeads(prev => prev.map(l => l.id === id ? u : l)); show(u.reachedOut ? 'MARKED REACHED' : 'MARKED PENDING') }
    catch { show('FAILED', 'error') }
  }

  const handleSaveNotes = async (id) => {
    try { const u = await updateNotes(id, noteText); setLeads(prev => prev.map(l => l.id === id ? u : l)); setNotePanel(null); show('NOTES SAVED') }
    catch { show('FAILED TO SAVE', 'error') }
  }

  const handleSend = () => {
    const ids = Array.from(selected).slice(0, 10)
    ids.forEach(id => {
      const l = leads.find(x => x.id === id)
      if (l?.phone) {
        const text = encodeURIComponent(messages[id] || '')
        window.open(`https://wa.me/${cleanPhone(l.phone)}?text=${text}`, '_blank')
      }
    })
    setShowQueue(false); setSelected(new Set())
  }

  const handleReachOut = async () => {
    if (selected.size === 0) return show('SELECT LEADS FIRST', 'error')
    try { const data = await generateMessages(Array.from(selected)); setMessages(data.messages || {}); setShowQueue(true) }
    catch { show('FAILED TO GENERATE', 'error') }
  }

  const sorted = [...leads].sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))

  return (
    <div className="page-container">
      <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px"}}>
        <div className="section-title" style={{marginBottom:0}}>LEADS</div>
        <div style={{display:"flex", gap:"8px"}}>
          <button onClick={async () => { await tidyLeads(); fetch(); show('NAMES CLEANED') }}
            className="btn" style={{fontSize:"10px", padding:"6px 12px"}}>TIDY NAMES</button>
          <button onClick={async () => { await scoreLeads(); fetch(); show('LEADS SCORED') }}
            className="btn" style={{fontSize:"10px", padding:"6px 12px"}}>SCORE ALL</button>
          <button onClick={async () => {
            if (window.confirm('Delete all leads?')) { await deleteAllLeads(); fetch(); show('ALL LEADS DELETED') }
          }} className="btn" style={{fontSize:"10px", padding:"6px 12px", color:"#ef4444"}}>DELETE ALL</button>
        </div>
      </div>

      <div style={{display:"flex", gap:"16px", marginBottom:"20px", alignItems:"center"}}>
        <input className="input" placeholder="SEARCH..." value={search} onChange={e => setSearch(e.target.value)}
          style={{maxWidth:"260px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", background:"#202020", border:"1px solid #2a2a2a", borderRadius:"4px", padding:"8px 12px", color:"#ffffff", outline:"none"}} />
        <div style={{display:"flex", gap:"6px"}}>
          {['all', 'reached', 'unreached'].map(f => (
            <button key={f} onClick={() => setReachFilter(f)}
              style={{
                fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", letterSpacing:"0.02em",
                padding:"6px 12px", borderRadius:"4px", cursor:"pointer",
                border: reachFilter === f ? "none" : "1px solid #202020",
                background: reachFilter === f ? "#7C89B0" : "transparent",
                color: reachFilter === f ? "#111111" : "#6B7280",
                transition:"all 0.15s",
              }}>
              {f === 'all' ? 'ALL' : f === 'reached' ? 'REACHED' : 'NOT REACHED'}
            </button>
          ))}
        </div>
        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563", marginLeft:"auto"}}>
          {leads.length} LEAD{leads.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="tile" style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", marginBottom:"12px"}}>
          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{selected.size} SELECTED</span>
          <button onClick={handleReachOut} className="btn" style={{fontSize:"10px", padding:"6px 14px"}}>
            GENERATE OUTREACH ({selected.size})
          </button>
        </div>
      )}

      {loading ? (
        <div style={{display:"flex", justifyContent:"center", padding:"80px 0"}}>
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <div className="tile" style={{padding:0, overflow:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid #202020"}}>
              <th style={{width:"32px", padding:"12px 8px 12px 16px"}}>
                <input type="checkbox" checked={selected.size === leads.length && leads.length > 0}
                  onChange={() => { selected.size === leads.length ? setSelected(new Set()) : setSelected(new Set(leads.map(l => l.id))) }}
                  style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
              </th>
              <th style={{width:"70px", padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>PRIORITY</th>
              <th style={{padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>NAME</th>
              <th style={{width:"140px", padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>PHONE</th>
              <th style={{width:"160px", padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>WEBSITE</th>
              <th style={{padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>ADDRESS</th>
              <th style={{width:"90px", padding:"12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"center"}}>STATUS</th>
              <th style={{width:"100px", padding:"12px 16px 12px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>NOTES</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(lead => (
              <tr key={lead.id}
                style={{borderBottom:"1px solid #202020", background: selected.has(lead.id) ? "#1a1a1a" : "transparent", transition:"background 0.1s"}}
                onMouseEnter={e => { if (!selected.has(lead.id)) e.currentTarget.style.background = "#181818" }}
                onMouseLeave={e => { if (!selected.has(lead.id)) e.currentTarget.style.background = "transparent" }}>
                <td style={{padding:"10px 8px 10px 16px", verticalAlign:"middle"}}>
                  <input type="checkbox" checked={selected.has(lead.id)}
                    onChange={() => { const n = new Set(selected); n.has(lead.id) ? n.delete(lead.id) : n.add(lead.id); setSelected(n) }}
                    style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle"}}>
                  {lead.opportunityScore != null
                    ? <span className={`priority-badge ${(lead.opportunityScore >= 80 ? 'hot' : lead.opportunityScore >= 50 ? 'potential' : 'low')}`}>
                        {lead.opportunityScore} {lead.opportunityScore >= 80 ? '🔥' : lead.opportunityScore >= 50 ? '✨' : ''}
                      </span>
                    : <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>—</span>}
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle"}}>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#ffffff"}}>
                    {lead.name || '—'}
                  </span>
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle", maxWidth:"140px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {lead.phone ? (
                    <button onClick={() => window.open(`https://wa.me/${cleanPhone(lead.phone)}`, '_blank')}
                      style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280", textDecoration:"underline", textUnderlineOffset:"2px", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left"}}>
                      {lead.phone}
                    </button>
                  ) : <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>—</span>}
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle", maxWidth:"160px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {lead.website ? (
                    <a href={lead.website} target="_blank" rel="noopener noreferrer"
                      style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#7C89B0", textDecoration:"underline", textUnderlineOffset:"2px"}}>
                      {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  ) : <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>—</span>}
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle", maxWidth:"200px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>
                    {lead.address || <span style={{color:"#4B5563"}}>—</span>}
                  </span>
                </td>
                <td style={{padding:"10px 8px", verticalAlign:"middle", textAlign:"center"}}>
                  <button onClick={() => handleToggle(lead.id)}
                    style={{
                      fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", letterSpacing:"0.02em",
                      padding:"4px 10px", cursor:"pointer",
                      border: lead.reachedOut ? "none" : "1px solid #202020",
                      background: lead.reachedOut ? "#7C89B0" : "transparent",
                      color: lead.reachedOut ? "#111111" : "#6B7280",
                      transition:"all 0.15s",
                    }}>
                    {lead.reachedOut ? 'REACHED' : 'PENDING'}
                  </button>
                </td>
                <td style={{padding:"10px 16px 10px 8px", verticalAlign:"middle"}}>
                  <button onClick={() => { setNotePanel(lead); setNoteText(lead.notes || '') }}
                    style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280", textDecoration:"underline", textUnderlineOffset:"2px", background:"none", border:"none", cursor:"pointer", padding:0, textAlign:"left"}}>
                    {lead.notes ? lead.notes.substring(0, 18) + (lead.notes.length > 18 ? '…' : '') : '+ ADD NOTE'}
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{textAlign:"center", padding:"40px 0", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#4B5563"}}>
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}

      {showQueue && (
        <div style={{position:"fixed", inset:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", padding:"16px"}}>
          <div className="tile" style={{width:"100%", maxWidth:"800px", maxHeight:"85vh", display:"flex", flexDirection:"column", padding:0, overflow:"hidden"}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid #202020"}}>
              <div>
                <span className="tile-label" style={{fontSize:"11px", marginBottom:"4px"}}>OUTREACH QUEUE</span>
                <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>{selected.size} leads</span>
              </div>
              <button onClick={() => setShowQueue(false)} className="btn-icon" style={{fontSize:"14px", width:"28px", height:"28px", display:"flex", alignItems:"center", justifyContent:"center"}}>✕</button>
            </div>
            <div style={{flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:"16px"}}>
              {leads.filter(l => selected.has(l.id)).map(lead => (
                <div key={lead.id} style={{border:"1px solid #202020", borderRadius:"4px", padding:"16px"}}>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px"}}>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"12px", color:"#ffffff"}}>{lead.name}</span>
                    {lead.website && <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280", background:"#202020", padding:"3px 8px", borderRadius:"3px"}}>HAS WEBSITE</span>}
                  </div>
                  <textarea className="input" value={messages[lead.id] || 'Generating...'} readOnly
                    style={{width:"100%", padding:"12px", fontSize:"11px", fontFamily:"IBM Plex Mono,monospace", minHeight:"100px", resize:"none", lineHeight:1.6}} />
                </div>
              ))}
            </div>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 24px", borderTop:"1px solid #202020"}}>
              <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#4B5563"}}>OPENS WHATSAPP IN BATCHES OF 10</span>
              <button onClick={handleSend} className="btn" style={{fontSize:"11px", padding:"8px 20px"}}>SEND VIA WHATSAPP</button>
            </div>
          </div>
        </div>
      )}

      {notePanel && (
        <div style={{position:"fixed", inset:0, zIndex:60, display:"flex", flexDirection:"column", justifyContent:"flex-end"}}
          onClick={() => setNotePanel(null)}>
          <div style={{flex:1}} />
          <div onClick={e => e.stopPropagation()} style={{
            background:"#171717", borderTop:"1px solid #202020", padding:"28px 32px",
            animation:"slideUp 0.2s ease-out",
            maxHeight:"50vh", overflowY:"auto",
          }}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px"}}>
              <div>
                <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:"4px"}}>NOTES FOR</span>
                <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"13px", color:"#ffffff"}}>{notePanel.name}</span>
              </div>
              <button onClick={() => setNotePanel(null)}
                style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"12px", color:"#6B7280", background:"none", border:"none", cursor:"pointer", padding:"4px 8px"}}>✕</button>
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus
              placeholder="Type your notes..."
              style={{
                width:"100%", minHeight:"120px", resize:"vertical",
                fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", lineHeight:1.6,
                background:"#202020", border:"1px solid #2a2a2a", color:"#ffffff",
                padding:"12px", outline:"none",
              }} />
            <div style={{display:"flex", justifyContent:"flex-end", gap:"8px", marginTop:"16px"}}>
              <button onClick={() => setNotePanel(null)} className="btn btn-secondary" style={{fontSize:"10px", padding:"8px 16px"}}>CANCEL</button>
              <button onClick={() => handleSaveNotes(notePanel.id)} className="btn" style={{fontSize:"10px", padding:"8px 16px", background:"#7C89B0", color:"#111111"}}>SAVE NOTES</button>
            </div>
          </div>
        </div>
      )}

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

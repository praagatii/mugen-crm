import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLeads } from '../services/api.js'

function RingChart({ pct }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#202020" strokeWidth="4" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#7C89B0" strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 36 36)" strokeLinecap="round" />
    </svg>
  )
}

function BarChart({ bars }) {
  const max = Math.max(...bars.map(b => b.value), 1)
  return (
    <div style={{display:"flex", gap:"6px", height:"80px", alignItems:"flex-end", marginTop:"16px"}}>
      {bars.map((bar, i) => (
        <div key={i} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px", height:"100%"}}>
          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#9CA3AF"}}>{bar.value}</span>
          <div style={{width:"100%", flex:1, background:"#202020", borderRadius:"2px", overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"flex-end"}}>
            <div style={{width:"100%", height:`${(bar.value / max) * 100}%`, background:"#7C89B0", borderRadius:"2px", opacity:bar.value?0.7:0.05}} />
          </div>
          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#4B5563", textTransform:"uppercase", letterSpacing:"0.06em"}}>{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

function CalendarTile() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [plans, setPlans] = useState(() => {
    try { const s = localStorage.getItem('plans'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [editText, setEditText] = useState("")

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleString('default', { month: 'long' })

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1)); setSelectedDay(null); setEditText("") }
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1)); setSelectedDay(null); setEditText("") }

  const selectDay = (day) => {
    setSelectedDay(day)
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`
    setEditText(plans[key] || "")
  }

  const savePlan = () => {
    if (selectedDay === null) return
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`
    const updated = { ...plans, [key]: editText }
    setPlans(updated)
    localStorage.setItem('plans', JSON.stringify(updated))
  }

  const removePlan = () => {
    if (selectedDay === null) return
    const key = `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`
    const updated = { ...plans }
    delete updated[key]
    setPlans(updated)
    setEditText("")
    localStorage.setItem('plans', JSON.stringify(updated))
  }

  const today = new Date()
  const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  const gridRows = Math.ceil((firstDay + daysInMonth) / 7)

  return (
    <div className="tile tile-calendar">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
        <button className="btn-icon" onClick={prevMonth}>◀</button>
        <span className="tile-label" style={{fontSize:"11px"}}>{monthName.toUpperCase()} {year}</span>
        <button className="btn-icon" onClick={nextMonth}>▶</button>
      </div>

      <div className="calendar-grid">
        {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const d = i + 1
          const key = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
          const hasPlan = plans[key] && plans[key].trim()
          return (
            <div key={d} onClick={() => selectDay(d)}
              className={`calendar-day ${isToday(d)?"today":""} ${selectedDay===d?"selected":""}`}>
              <span style={{fontSize:"12px"}}>{d}</span>
              {hasPlan && <span className="calendar-dot" />}
            </div>
          )
        })}
        {Array.from({length:gridRows*7 - firstDay - daysInMonth}).map((_,i) => <div key={`l${i}`} />)}
      </div>

      {selectedDay !== null && (
        <div style={{marginTop:"16px", borderTop:"1px solid #202020", paddingTop:"14px"}}>
          <span className="tile-sub" style={{marginBottom:"8px", fontSize:"9px"}}>
            PLAN — {monthName.toUpperCase()} {selectedDay}, {year}
          </span>
          <div style={{display:"flex", gap:"6px"}}>
            <input className="calendar-input" value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Add plan..." />
            <button className="btn" onClick={savePlan} style={{padding:"8px 12px", fontSize:"10px"}}>SAVE</button>
            {editText && <button className="btn" onClick={removePlan} style={{padding:"8px 12px", fontSize:"10px", color:"#6B7280"}}>×</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLeads().then(data => {
      setLeads(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const total = leads.length
  const reached = leads.filter(l => l.reachedOut).length
  const pending = total - reached
  const high = leads.filter(l => l.priority === 'HIGH').length
  const medium = leads.filter(l => l.priority === 'MEDIUM').length
  const low = leads.filter(l => l.priority === 'LOW').length
  const withWebsite = leads.filter(l => l.website && l.website.trim()).length

  if (loading) {
    return (
    <div className="page-container">
        <div style={{display:"flex", justifyContent:"center", padding:"80px 0"}}>
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const reachPct = total ? Math.round((reached / total) * 100) : 0

  return (
    <div className="page-container">
      {/* Title */}
      <span className="section-title" style={{marginBottom:"24px", display:"block"}}>PIPELINE</span>

      {/* Tile Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
      }}>
        {/* TILE A — TOTAL */}
        <div className="tile">
          <span className="tile-label">TOTAL LEADS</span>
          <span className="tile-value">{total}</span>
        </div>

        {/* TILE B — REACHED */}
        <div className="tile">
          <span className="tile-label">REACHED</span>
          <span className="tile-value">{reached}</span>
        </div>

        {/* TILE C — PENDING + HIGH */}
        <div className="tile" style={{display:"flex", flexDirection:"column", background:"#7C89B0"}}>
          <span className="tile-label" style={{color:"#D9D8D0"}}>PENDING</span>
          <span className="tile-value" style={{marginBottom:"20px", marginTop:"0"}}>{pending}</span>
          <div style={{marginTop:"auto", paddingTop:"16px", borderTop:"2px solid rgba(255,255,255,0.2)"}}>
            <span className="tile-label" style={{fontSize:"9px", color:"#D9D8D0"}}>HIGH PRIORITY</span>
            <span className="tile-value-sm" style={{marginTop:"4px"}}>{high}</span>
          </div>
        </div>

        {/* TILE D — REACH RATE */}
        <div className="tile">
          <span className="tile-label">REACH RATE</span>
          <div style={{display:"flex", alignItems:"center", gap:"16px", marginTop:"12px"}}>
            <RingChart pct={reachPct} />
            <div>
              <span className="tile-value" style={{fontSize:"28px", marginTop:0}}>{reachPct}%</span>
              <span className="tile-sub">{reached}/{total} reached</span>
            </div>
          </div>
        </div>

        {/* TILE E — PRIORITY */}
        <div className="tile">
          <span className="tile-label">PRIORITY</span>
          <BarChart bars={[
            { label: 'High', value: high },
            { label: 'Med', value: medium },
            { label: 'Low', value: low },
          ]} />
        </div>

        {/* TILE F — WEBSITE */}
        <div className="tile">
          <span className="tile-label">WITH WEBSITE</span>
          <span className="tile-value">{withWebsite}</span>
          <span className="tile-sub">{total ? Math.round((withWebsite / total) * 100) : 0}% of total</span>
        </div>

        {/* TILE G — RECENT LEADS (span 2) */}
        <div className="tile" style={{gridColumn:"span 2", minHeight:"320px", background:"#D9D8D0"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
            <span className="tile-label" style={{color:"#111111"}}>RECENT LEADS</span>
            {leads.length > 0 && (
              <Link to="/leads" className="flex items-center justify-center"
                style={{width:"32px", height:"32px", borderRadius:"50%", background:"#111111", color:"#D9D8D0", textDecoration:"none", fontSize:"16px", transition:"opacity 0.15s"}}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                ↗
              </Link>
            )}
          </div>
          {leads.length === 0 ? (
            <div style={{padding:"40px 0", textAlign:"center"}}>
              <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280"}}>No leads yet.</p>
              <Link to="/upload" style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#111111", textDecoration:"none", marginTop:"8px", display:"inline-block"}}>
                UPLOAD CSV
              </Link>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{display:"grid", gridTemplateColumns:"2fr 1.5fr 0.8fr 0.8fr", gap:"8px", padding:"8px 0", borderBottom:"1px solid #c8c7bf"}}>
                <span className="tile-sub" style={{fontSize:"9px", color:"#111111"}}>NAME</span>
                <span className="tile-sub" style={{fontSize:"9px", color:"#111111"}}>CONTACT</span>
                <span className="tile-sub" style={{fontSize:"9px", color:"#111111", textAlign:"center"}}>PRIORITY</span>
                <span className="tile-sub" style={{fontSize:"9px", color:"#111111", textAlign:"right"}}>STATUS</span>
              </div>
              {/* Rows */}
              {leads.slice(0, 5).map(lead => (
                <div key={lead.id} style={{
                  display:"grid", gridTemplateColumns:"2fr 1.5fr 0.8fr 0.8fr", gap:"8px",
                  padding:"10px 0", borderBottom:"1px solid #c8c7bf",
                  alignItems:"center", transition:"background 0.1s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#c8c7bf"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#111111", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {lead.name || '—'}
                  </span>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {lead.phone || lead.email || '—'}
                  </span>
                  <span style={{textAlign:"center"}}>
                    {lead.priority && <span className={`priority-badge ${lead.priority.toLowerCase()}`} style={{minWidth:"56px", textAlign:"center"}}>{lead.priority}</span>}
                  </span>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"right", color: lead.reachedOut ? "#111111" : "#4B5563"}}>
                    {lead.reachedOut ? 'REACHED' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TILE H+I — PRIORITY BREAKDOWN (stacked in col 3) */}
        <div className="tile" style={{display:"flex", flexDirection:"column"}}>
          <span className="tile-label">PRIORITY BREAKDOWN</span>
          <div style={{marginTop:"16px", display:"flex", flexDirection:"column", gap:"12px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <span className="tile-sub" style={{margin:0}}>HIGH</span>
              <span className="tile-value-sm" style={{color:"#7C89B0"}}>{high}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #202020", paddingTop:"12px"}}>
              <span className="tile-sub" style={{margin:0}}>MEDIUM</span>
              <span className="tile-value-sm">{medium}</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #202020", paddingTop:"12px"}}>
              <span className="tile-sub" style={{margin:0}}>LOW</span>
              <span className="tile-value-sm">{low}</span>
            </div>
          </div>
        </div>

        {/* CALENDAR — full width */}
        <div style={{gridColumn:"1 / -1", marginTop:"8px"}}>
          <CalendarTile leads={leads} />
        </div>
      </div>
    </div>
  )
}

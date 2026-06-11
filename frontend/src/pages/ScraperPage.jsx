import { useState } from 'react'
import { scrapeGmaps, importLeads } from '../services/api.js'

export default function ScraperPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [activeTab, setActiveTab] = useState('basic')

  const show = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleScrape = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults(null)
    setSelected(new Set())
    try {
      const data = await scrapeGmaps(query.trim())
      setResults(data.results || data)
    } catch (err) {
      show(err.message || 'Scrape failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (selected.size === 0) return
    setImporting(true)
    try {
      const toImport = results.filter((_, i) => selected.has(i))
      await importLeads(toImport)
      show(`IMPORTED ${selected.size} LEAD${selected.size !== 1 ? 'S' : ''}`)
      setSelected(new Set())
    } catch (err) {
      show(err.message || 'Import failed', 'error')
    } finally {
      setImporting(false)
    }
  }

  const toggleAll = () => {
    if (!results) return
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map((_, i) => i)))
  }

  const cell = (v, fallback = '—') => (
    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color: v ? "#ffffff" : "#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block"}}>
      {v || fallback}
    </span>
  )

  return (
    <div className="page-container">
      <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:"24px"}}>
        <div className="section-title" style={{marginBottom:0}}>GMAP SCRAPER</div>
      </div>

      <div className="tile" style={{marginBottom:"8px", padding:"20px 28px"}}>
        <div style={{display:"flex", gap:"12px", alignItems:"flex-end"}}>
          <div style={{flex:1}}>
            <span className="tile-label" style={{marginBottom:"6px", fontSize:"11px"}}>SEARCH QUERY</span>
            <input className="input" value={query} onChange={e => setQuery(e.target.value)}
              placeholder='e.g. "plumbers in new york"' style={{fontSize:"12px"}}
              onKeyDown={e => e.key === 'Enter' && handleScrape()} />
          </div>
          <button onClick={handleScrape} disabled={loading || !query.trim()} className="btn-primary"
            style={{padding:"10px 24px", fontSize:"11px", whiteSpace:"nowrap", minWidth:"100px"}}>
            {loading ? 'SCRAPING...' : 'SCRAPE'}
          </button>
        </div>
      </div>

      {results && (
        <div className="tile" style={{padding:0, overflow:"hidden"}}>
          {results.length === 0 ? (
            <div style={{padding:"40px 0", textAlign:"center", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280"}}>
              No results found
            </div>
          ) : (
            <>
              {selected.size > 0 && (
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 20px", borderBottom:"1px solid #202020", background:"#1a1a1a"}}>
                  <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{selected.size} SELECTED</span>
                  <button onClick={handleImport} disabled={importing} className="btn" style={{fontSize:"10px", padding:"6px 14px"}}>
                    {importing ? 'IMPORTING...' : `IMPORT ${selected.size}`}
                  </button>
                </div>
              )}

              <div style={{borderBottom:"1px solid #202020", display:"flex"}}>
                <button onClick={() => setActiveTab('basic')}
                  style={{flex:1, padding:"10px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", textTransform:"uppercase", letterSpacing:"0.08em", border:"none", background: activeTab==='basic' ? "#1a1a1a" : "transparent", color: activeTab==='basic' ? "#ffffff" : "#6B7280", cursor:"pointer"}}>
                  BASIC
                </button>
                <button onClick={() => setActiveTab('details')}
                  style={{flex:1, padding:"10px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", textTransform:"uppercase", letterSpacing:"0.08em", border:"none", background: activeTab==='details' ? "#1a1a1a" : "transparent", color: activeTab==='details' ? "#ffffff" : "#6B7280", cursor:"pointer"}}>
                  DETAILS
                </button>
                <button onClick={() => setActiveTab('reviews')}
                  style={{flex:1, padding:"10px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", textTransform:"uppercase", letterSpacing:"0.08em", border:"none", background: activeTab==='reviews' ? "#1a1a1a" : "transparent", color: activeTab==='reviews' ? "#ffffff" : "#6B7280", cursor:"pointer"}}>
                  REVIEWS
                </button>
              </div>

              <div style={{overflowX:"auto"}}>
                {activeTab === 'basic' && (
                  <>
                    <div style={{display:"grid", gridTemplateColumns:"32px 1.5fr 1.2fr 0.8fr 0.6fr 0.6fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"center"}}>
                      <div><input type="checkbox" checked={selected.size === results.length} onChange={toggleAll} style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} /></div>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>NAME</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>ADDRESS</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>PHONE</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>RATING</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>REVIEWS</span>
                    </div>
                    {results.map((r, i) => (
                      <div key={i} style={{display:"grid", gridTemplateColumns:"32px 1.5fr 1.2fr 0.8fr 0.6fr 0.6fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"center", background: selected.has(i) ? "#1a1a1a" : "transparent", transition:"background 0.1s"}}
                        onMouseEnter={e => { if (!selected.has(i)) e.currentTarget.style.background = "#181818" }}
                        onMouseLeave={e => { if (!selected.has(i)) e.currentTarget.style.background = "transparent" }}>
                        <div><input type="checkbox" checked={selected.has(i)} onChange={() => { const n = new Set(selected); n.has(i) ? n.delete(i) : n.add(i); setSelected(n) }} style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} /></div>
                        <div style={{maxWidth:"250px", overflow:"hidden"}}>
                          {cell(r.name)}
                          {r.category && <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"8px", color:"#7C89B0", display:"block"}}>{r.category}</span>}
                        </div>
                        {cell(r.address)}
                        {cell(r.phone)}
                        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"center", color: r.rating ? "#7C89B0" : "#6B7280"}}>
                          {r.rating ? `${r.rating}★` : '—'}
                        </span>
                        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"center", color: "#6B7280"}}>
                          {r.reviewCount || '—'}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === 'details' && (
                  <>
                    <div style={{display:"grid", gridTemplateColumns:"32px 1.2fr 1.5fr 1fr 0.8fr 0.8fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"center"}}>
                      <div></div>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>WEBSITE</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>STATUS / HOURS</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>PRICE</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>TIMEZONE</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>PLUS CODE</span>
                    </div>
                    {results.map((r, i) => (
                      <div key={i} style={{display:"grid", gridTemplateColumns:"32px 1.2fr 1.5fr 1fr 0.8fr 0.8fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"center", background:"transparent"}}>
                        <div></div>
                        <div style={{maxWidth:"200px", overflow:"hidden"}}>
                          {r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#7C89B0", textDecoration:"underline", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block"}}>{r.website}</a> : cell(null)}
                        </div>
                        <div>
                          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color: r.status ? "#ffffff" : "#6B7280", display:"block"}}>{r.status || '—'}</span>
                          {r.openHours && r.openHours.Monday && <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"8px", color:"#6B7280"}}>{r.openHours.Monday[0]}</span>}
                        </div>
                        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color: r.priceRange ? "#7C89B0" : "#6B7280"}}>{r.priceRange || '—'}</span>
                        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"center", color:"#6B7280"}}>{r.timezone || '—'}</span>
                        <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", textAlign:"center", color:"#6B7280"}}>{r.plusCode || '—'}</span>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === 'reviews' && (
                  <>
                    <div style={{display:"grid", gridTemplateColumns:"32px 1.2fr 0.5fr 0.5fr 2fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"center"}}>
                      <div></div>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>AUTHOR</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>RATING</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"center"}}>EMAILS</span>
                      <span className="tile-sub" style={{fontSize:"9px",textAlign:"left"}}>REVIEW TEXT</span>
                    </div>
                    {results.map((r, i) => {
                      const reviews = r.userReviews || []
                      const emails = r.emails || []
                      const firstReview = reviews[0]
                      return (
                        <div key={i} style={{display:"grid", gridTemplateColumns:"32px 1.2fr 0.5fr 0.5fr 2fr", gap:"4px", padding:"10px 16px", borderBottom:"1px solid #202020", alignItems:"start", background: selected.has(i) ? "#1a1a1a" : "transparent"}}>
                          <div><input type="checkbox" checked={selected.has(i)} onChange={() => { const n = new Set(selected); n.has(i) ? n.delete(i) : n.add(i); setSelected(n) }} style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} /></div>
                          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#ffffff"}}>{r.name}</span>
                          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"center", color: r.rating ? "#7C89B0" : "#6B7280"}}>{r.rating ? `${r.rating}★` : '—'}</span>
                          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", textAlign:"center", color: emails.length ? "#7C89B0" : "#6B7280"}}>{emails.length || '—'}</span>
                          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block"}}>
                            {firstReview ? `${firstReview.authorName}: "${firstReview.description}"` : '—'}
                          </span>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              <div style={{padding:"12px 20px", borderTop:"1px solid #202020", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280"}}>
                  {results.length} RESULT{results.length !== 1 ? 'S' : ''}
                </span>
                {selected.size > 0 && (
                  <button onClick={handleImport} disabled={importing} className="btn" style={{fontSize:"10px", padding:"6px 14px"}}>
                    {importing ? 'IMPORTING...' : `IMPORT ${selected.size}`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="tile" style={{padding:"60px 28px", textAlign:"center"}}>
          <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"12px", color:"#8C8C8A", marginBottom:"8px"}}>
            Enter a search query to scrape Google Maps
          </p>
          <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>
            Results can be imported directly as leads
          </p>
        </div>
      )}

      {loading && (
        <div className="tile" style={{padding:"60px 28px", textAlign:"center"}}>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"12px"}}>
            <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
            <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280"}}>SCRAPING GOOGLE MAPS...</span>
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

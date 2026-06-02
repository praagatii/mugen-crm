import { useState } from 'react'
import { scrapeGmaps, importLeads } from '../services/api.js'

export default function ScraperPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState(null)

  const show = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000) }

  const handleScrape = async () => {
    if (!query.trim()) return
    setLoading(true)
    setResults(null)
    setSelected(new Set())
    try {
      const data = await scrapeGmaps({ query: query.trim() })
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

              <div style={{overflowX:"auto"}}>
                <div style={{
                  display:"grid",
                  gridTemplateColumns:"32px 1fr 1.2fr 0.8fr 0.6fr",
                  gap:"4px", padding:"10px 16px",
                  borderBottom:"1px solid #202020",
                  alignItems:"center",
                }}>
                  <div>
                    <input type="checkbox" checked={selected.size === results.length} onChange={toggleAll}
                      style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
                  </div>
                  <span className="tile-sub" style={{fontSize:"9px", textAlign:"left"}}>NAME</span>
                  <span className="tile-sub" style={{fontSize:"9px", textAlign:"left"}}>ADDRESS</span>
                  <span className="tile-sub" style={{fontSize:"9px", textAlign:"left"}}>PHONE</span>
                  <span className="tile-sub" style={{fontSize:"9px", textAlign:"center"}}>RATING</span>
                </div>
                {results.map((r, i) => (
                  <div key={i} style={{
                    display:"grid",
                    gridTemplateColumns:"32px 1fr 1.2fr 0.8fr 0.6fr",
                    gap:"4px", padding:"10px 16px",
                    borderBottom:"1px solid #202020",
                    alignItems:"center",
                    background: selected.has(i) ? "#1a1a1a" : "transparent",
                    transition:"background 0.1s",
                  }}
                    onMouseEnter={e => { if (!selected.has(i)) e.currentTarget.style.background = "#181818" }}
                    onMouseLeave={e => { if (!selected.has(i)) e.currentTarget.style.background = "transparent" }}>
                    <div>
                      <input type="checkbox" checked={selected.has(i)}
                        onChange={() => { const n = new Set(selected); n.has(i) ? n.delete(i) : n.add(i); setSelected(n) }}
                        style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
                    </div>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#ffffff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", maxWidth:"250px"}}>
                      {r.name || '—'}
                    </span>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", maxWidth:"250px"}}>
                      {r.address || '—'}
                    </span>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>
                      {r.phone || '—'}
                    </span>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", textAlign:"center", color: r.rating ? "#7C89B0" : "#6B7280"}}>
                      {r.rating || '—'}
                    </span>
                  </div>
                ))}
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

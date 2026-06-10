import { useState } from 'react'
import { Link } from 'react-router-dom'
import { scrapeGmaps, importLeads } from '../services/api.js'

export default function ScrapePage() {
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [maxResults, setMaxResults] = useState(20)
  const [scraping, setScraping] = useState(false)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(null)
  const [error, setError] = useState('')

  const handleScrape = async () => {
    if (!keyword.trim() || !location.trim()) return
    setScraping(true); setResults([]); setSelected(new Set()); setImportCount(null); setError('')
    try {
      const data = await scrapeGmaps(`${keyword} near ${location}`, maxResults)
      setResults(data.results || [])
      if (!data.results || data.results.length === 0) setError('No results found')
    } catch (err) {
      setError(err.message || 'Scrape failed')
    } finally { setScraping(false) }
  }

  const toggle = (i) => {
    const n = new Set(selected)
    n.has(i) ? n.delete(i) : n.add(i)
    setSelected(n)
  }

  const toggleAll = () => {
    if (selected.size === results.length) setSelected(new Set())
    else setSelected(new Set(results.map((_, i) => i)))
  }

  const handleImport = async () => {
    const items = Array.from(selected).map(i => results[i])
    if (items.length === 0) return
    setImporting(true); setError('')
    try {
      const data = await importLeads(items)
      setImportCount(data.imported)
      setResults([]); setSelected(new Set())
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally { setImporting(false) }
  }

  return (
    <div className="page-container">
      <div className="section-title" style={{marginBottom:"24px"}}>SCRAPE GOOGLE MAPS</div>

      {/* ─── Search Bar ─── */}
      <div className="tile" style={{padding:"24px", marginBottom:"20px"}}>
        <div style={{display:"flex", gap:"12px", alignItems:"flex-end", flexWrap:"wrap"}}>
          <div>
            <label style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:"6px"}}>Business Type</label>
            <input className="input" placeholder="e.g. plumber, dentist, cafe" value={keyword} onChange={e => setKeyword(e.target.value)}
              style={{width:"220px", fontSize:"11px"}} />
          </div>
          <div>
            <label style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:"6px"}}>Location</label>
            <input className="input" placeholder="e.g. Mumbai, Delhi" value={location} onChange={e => setLocation(e.target.value)}
              style={{width:"220px", fontSize:"11px"}}
              onKeyDown={e => { if (e.key === 'Enter') handleScrape() }} />
          </div>
          <button onClick={handleScrape} disabled={scraping || !keyword.trim() || !location.trim()}
            className="btn" style={{fontSize:"10px", padding:"8px 24px", height:"35px"}}>
            {scraping ? (
              <span style={{display:"flex", alignItems:"center", gap:"6px"}}>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                SCRAPING...
              </span>
            ) : 'SCRAPE'}
          </button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:"12px", marginTop:"16px", paddingTop:"16px", borderTop:"1px solid #202020"}}>
          <label style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap"}}>Results</label>
          <input type="range" min="5" max="50" value={maxResults} onChange={e => setMaxResults(Number(e.target.value))}
            style={{flex:1, accentColor:"#7C89B0", height:"4px", cursor:"pointer"}} />
          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#ffffff", minWidth:"24px", textAlign:"right"}}>{maxResults}</span>
        </div>
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="tile" style={{display:"flex", alignItems:"center", gap:"8px", padding:"14px 20px", marginBottom:"20px"}}>
          <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{error}</span>
        </div>
      )}

      {/* ─── Results ─── */}
      {results.length > 0 && (
        <div className="tile" style={{padding:0, overflow:"auto"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderBottom:"1px solid #202020"}}>
            <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{results.length} results</span>
          </div>

          <table style={{width:"100%", borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:"1px solid #202020"}}>
                <th style={{width:"36px", padding:"10px 8px 10px 20px"}}>
                  <input type="checkbox" checked={selected.size === results.length} onChange={toggleAll}
                    style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
                </th>
                <th style={{padding:"10px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>NAME</th>
                <th style={{width:"150px", padding:"10px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>PHONE</th>
                <th style={{width:"180px", padding:"10px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>WEBSITE</th>
                <th style={{padding:"10px 20px 10px 8px", fontFamily:"IBM Plex Mono,monospace", fontSize:"9px", fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.08em", textAlign:"left"}}>ADDRESS</th>
              </tr>
            </thead>
            <tbody>
              {results.map((item, i) => (
                <tr key={i}
                  style={{borderBottom:"1px solid #202020", background: selected.has(i) ? "#1a1a1a" : "transparent", transition:"background 0.1s"}}
                  onMouseEnter={e => { if (!selected.has(i)) e.currentTarget.style.background = "#181818" }}
                  onMouseLeave={e => { if (!selected.has(i)) e.currentTarget.style.background = "transparent" }}>
                  <td style={{padding:"8px 8px 8px 20px", verticalAlign:"middle"}}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)}
                      style={{accentColor:"#7C89B0", width:"14px", height:"14px", cursor:"pointer"}} />
                  </td>
                  <td style={{padding:"8px 8px", verticalAlign:"middle"}}>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#ffffff"}}>{item.name || '—'}</span>
                  </td>
                  <td style={{padding:"8px 8px", verticalAlign:"middle", maxWidth:"150px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{item.phone || '—'}</span>
                  </td>
                  <td style={{padding:"8px 8px", verticalAlign:"middle", maxWidth:"180px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{item.website || '—'}</span>
                  </td>
                  <td style={{padding:"8px 20px 8px 8px", verticalAlign:"middle", maxWidth:"250px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{item.address || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid #202020"}}>
            <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>
              {selected.size} of {results.length} selected
            </span>
            {importCount !== null ? (
              <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#7C89B0"}}>Imported {importCount} lead{importCount !== 1 ? 's' : ''}</span>
                <Link to="/leads" className="btn" style={{fontSize:"10px", padding:"6px 16px", textDecoration:"none"}}>VIEW LEADS →</Link>
              </div>
            ) : (
              <button onClick={handleImport} disabled={importing || selected.size === 0}
                className="btn" style={{fontSize:"10px", padding:"6px 16px"}}>
                {importing ? (
                  <span style={{display:"flex", alignItems:"center", gap:"6px"}}>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    IMPORTING...
                  </span>
                ) : `IMPORT SELECTED (${selected.size})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {results.length === 0 && !scraping && !error && (
        <div className="tile" style={{textAlign:"center", padding:"80px 40px"}}>
          <div style={{width:"48px", height:"48px", margin:"0 auto 20px", borderRadius:"50%", background:"#202020", display:"flex", alignItems:"center", justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"12px", color:"#6B7280", marginBottom:"8px"}}>Enter a business type and location to scrape leads from Google Maps</p>
          <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>Results will appear here</p>
        </div>
      )}
    </div>
  )
}
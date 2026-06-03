import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { uploadCsv } from '../services/api.js'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.csv')) { setFile(f); setResult(null); setError('') }
    else { setError('Please drop a .csv file') }
  }

  const handleSelect = (e) => {
    const f = e.target.files[0]
    if (f) { setFile(f); setResult(null); setError('') }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true); setError(''); setResult(null)
    try {
      const data = await uploadCsv(file)
      setResult(data.imported)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-container">
      <div className="section-title" style={{marginBottom:"32px"}}>UPLOAD</div>

      <div className="grid grid-cols-1 lg:grid-cols-3" style={{gap:"24px"}}>
        <div className="lg:col-span-2" style={{display:"flex", flexDirection:"column", gap:"16px"}}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="tile"
            style={{
              padding:"64px 40px", textAlign:"center", cursor:"pointer",
              transition:"all 0.15s", minHeight:"300px",
              display:"flex", alignItems:"center", justifyContent:"center",
              border: dragging ? "1px solid #7C89B0" : "none",
              background: dragging ? "#1a1a1a" : "",
            }}
          >
            <input ref={inputRef} type="file" accept=".csv" onChange={handleSelect} className="hidden" />
            {file ? (
              <div>
                <div style={{width:"40px", height:"40px", borderRadius:"50%", background:"#202020", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C89B0" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"13px", color:"#ffffff", marginBottom:"4px"}}>{file.name}</p>
                <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280", marginBottom:"20px"}}>{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); setError('') }}
                  style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280", background:"transparent", border:"1px solid #202020", borderRadius:"4px", padding:"6px 14px", cursor:"pointer", letterSpacing:"0.02em"}}>
                  REMOVE
                </button>
              </div>
            ) : (
              <div>
                <div style={{width:"40px", height:"40px", borderRadius:"50%", background:"#202020", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px"}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"13px", color:"#6B7280", marginBottom:"4px"}}>Drop your CSV here or click to browse</p>
                <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563"}}>.csv files only</p>
              </div>
            )}
          </div>

          {error && (
            <div className="tile" style={{display:"flex", alignItems:"center", gap:"8px", padding:"16px 20px"}}>
              <span style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#6B7280"}}>{error}</span>
            </div>
          )}

          {file && result === null && (
            <button onClick={handleUpload} disabled={loading} className="btn" style={{width:"100%", padding:"10px 20px", fontSize:"11px"}}>
              {loading ? (
                <span style={{display:"flex", alignItems:"center", gap:"8px"}}>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  IMPORTING...
                </span>
              ) : `IMPORT ${file.name.toUpperCase()}`}
            </button>
          )}

          {result !== null && (
            <div className="tile" style={{textAlign:"center", padding:"20px 24px"}}>
              <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"13px", color:"#ffffff", fontWeight:500, marginBottom:"8px"}}>
                Imported {result} lead{result !== 1 ? 's' : ''}
              </p>
              <Link to="/leads" style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#7C89B0", textDecoration:"none", letterSpacing:"0.02em"}}>
                VIEW LEADS →
              </Link>
            </div>
          )}
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>
          <div className="tile">
            <span className="tile-label" style={{marginBottom:"20px", fontSize:"10px"}}>INSTRUCTIONS</span>
            <ul style={{display:"flex", flexDirection:"column", gap:"16px"}}>
              <li style={{display:"flex", gap:"12px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280", lineHeight:1.5}}>
                <span style={{color:"#7C89B0", fontFamily:"IBM Plex Mono,monospace", flexShrink:0}}>01</span>
                Export leads from GMap Scraper as CSV
              </li>
              <li style={{display:"flex", gap:"12px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280", lineHeight:1.5}}>
                <span style={{color:"#7C89B0", fontFamily:"IBM Plex Mono,monospace", flexShrink:0}}>02</span>
                Drop the CSV file on the upload area or click to browse
              </li>
              <li style={{display:"flex", gap:"12px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280", lineHeight:1.5}}>
                <span style={{color:"#7C89B0", fontFamily:"IBM Plex Mono,monospace", flexShrink:0}}>03</span>
                Click "Import" to bring leads into your pipeline
              </li>
              <li style={{display:"flex", gap:"12px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#6B7280", lineHeight:1.5}}>
                <span style={{color:"#7C89B0", fontFamily:"IBM Plex Mono,monospace", flexShrink:0}}>04</span>
                Use AI tools to clean names, score opportunities, and generate outreach
              </li>
            </ul>
          </div>

          <div className="tile">
            <span className="tile-label" style={{marginBottom:"20px", fontSize:"10px"}}>EXPECTED FORMAT</span>
            <div style={{background:"#202020", borderRadius:"4px", padding:"16px", fontFamily:"IBM Plex Mono,monospace", fontSize:"11px", color:"#9CA3AF", lineHeight:"1.8"}}>
              name, phone, address, website<br />
              "Example Business", "+91 9876543210",<br />
              "123 Main St", "example.com"
            </div>
            <p style={{fontFamily:"IBM Plex Mono,monospace", fontSize:"10px", color:"#4B5563", marginTop:"12px"}}>
              Any CSV with these columns will work — others are optional.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
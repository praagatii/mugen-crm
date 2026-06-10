const API = '/api/leads'

export async function uploadCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export async function getLeads({ search, filterReached } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (filterReached !== undefined && filterReached !== null) {
    params.set('filterReached', filterReached)
  }
  const res = await fetch(`${API}${params.toString() ? '?' + params.toString() : ''}`)
  if (!res.ok) throw new Error('Failed to fetch leads')
  return res.json()
}

export async function toggleStatus(id) {
  const res = await fetch(`${API}/${id}/status`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to toggle status')
  return res.json()
}

export async function updateNotes(id, notes) {
  const res = await fetch(`${API}/${id}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  })
  if (!res.ok) throw new Error('Failed to update notes')
  return res.json()
}

export async function tidyLeads() {
  const res = await fetch(`${API}/tidy`, { method: 'POST' })
  if (!res.ok) throw new Error('Tidy failed')
  return res.json() // { cleaned: N, details: [...] }
}

export async function scoreLeads() {
  const res = await fetch(`${API}/score`, { method: 'POST' })
  if (!res.ok) throw new Error('Score failed')
  return res.json()
}

export async function generateMessages(ids) {
  const res = await fetch(`${API}/outreach/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Generate messages failed')
  return res.json()
}

export async function scrapeGmaps(query, maxResults = 20) {
  const res = await fetch(`${API}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, maxResults }),
  })
  if (!res.ok) throw new Error('Scrape failed')
  return res.json()
}

export async function deleteLead(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
  return res.json()
}

export async function deleteAllLeads() {
  const res = await fetch(`${API}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete all failed')
  return res.json()
}

export async function importLeads(leads) {
  const res = await fetch(`${API}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leads }),
  })
  if (!res.ok) throw new Error('Import failed')
  return res.json()
}

import { useState } from 'react'
import { motion } from 'framer-motion'
import LeadRow from './LeadRow.jsx'

export default function LeadsTable({ leads, priorityFilter, onPriorityFilterChange, selected, onToggleSelect, onToggleAll, onToggleStatus, onEditNotes, onSendWhatsApp }) {
  const [sortField, setSortField] = useState('priority')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = [...leads].sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    let cmp = 0
    if (sortField === 'priority') {
      cmp = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
    } else if (sortField === 'name') {
      cmp = (a.name || '').localeCompare(b.name || '')
    } else if (sortField === 'rating') {
      cmp = (a.rating ?? -1) - (b.rating ?? -1)
    } else if (sortField === 'status') {
      cmp = (a.reachedOut ? 1 : 0) - (b.reachedOut ? 1 : 0)
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const filtered = priorityFilter === 'all'
    ? sorted
    : sorted.filter(l => l.priority === priorityFilter)

  const SortHeader = ({ field, label, className = '' }) => (
    <th
      className={`py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted cursor-pointer hover:text-primary transition-colors select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-primary text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  )

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{leads.length} leads</span>
          <span className="w-px h-4 bg-hairline" />
          <div className="filter-group">
            {['all', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
              <button
                key={p}
                onClick={() => onPriorityFilterChange(p)}
                className={`filter-pill text-xs px-3 py-1.5 ${priorityFilter === p ? 'active' : ''}`}
              >
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline">
              <th className="py-3.5 pl-6 pr-2 w-10">
                <input
                  type="checkbox"
                  checked={selected.size === leads.length && leads.length > 0}
                  onChange={onToggleAll}
                  className="rounded border-hairline accent-primary"
                />
              </th>
              <SortHeader field="priority" label="Priority" />
              <SortHeader field="name" label="Name" />
              <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted">Phone</th>
              <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted hidden md:table-cell">Website</th>
              <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted hidden lg:table-cell">Address</th>
              <SortHeader field="rating" label="Rating" className="hidden sm:table-cell text-center" />
              <SortHeader field="status" label="Status" className="text-center" />
              <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead, i) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                index={i}
                selected={selected.has(lead.id)}
                onToggleSelect={() => onToggleSelect(lead.id)}
                onToggleStatus={() => onToggleStatus(lead.id)}
                onEditNotes={() => onEditNotes(lead)}
                onSendWhatsApp={() => onSendWhatsApp(lead)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">No leads match your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

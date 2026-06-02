import { motion } from 'framer-motion'

function cleanPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '91' + digits
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1)
  return digits
}

export default function LeadRow({ lead, index, selected, onToggleSelect, onToggleStatus, onEditNotes, onSendWhatsApp }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className={`border-b border-border-light transition-colors ${
        selected ? 'bg-soft-stone/50' : 'hover:bg-soft-stone/30'
      }`}
    >
      <td className="py-3 pl-6 pr-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="rounded border-hairline accent-primary"
        />
      </td>
      <td className="py-3 px-4">
        {lead.priority ? (
          <span className={`badge badge-${lead.priority.toLowerCase()}`}>{lead.priority}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <p className="font-medium text-ink truncate max-w-[200px]">{lead.name || '—'}</p>
      </td>
      <td className="py-3 px-4">
        {lead.phone ? (
          <button
            onClick={() => {
              const cleaned = cleanPhone(lead.phone)
              window.open(`https://wa.me/${cleaned}`, '_blank')
            }}
            className="text-muted hover:text-primary transition-colors underline underline-offset-2"
          >
            {lead.phone}
          </button>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4 hidden md:table-cell">
        {lead.website ? (
          <a
            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-primary transition-colors truncate block max-w-[200px] underline underline-offset-2"
          >
            {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4 hidden lg:table-cell">
        <span className="text-muted truncate block max-w-[220px]">{lead.address || <span className="text-muted">—</span>}</span>
      </td>
      <td className="py-3 px-4 hidden sm:table-cell text-center">
        <span className="text-muted">{lead.rating != null ? lead.rating : <span className="text-muted">—</span>}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <button
          onClick={onToggleStatus}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            lead.reachedOut
              ? 'bg-success/5 text-success border border-success/20'
              : 'bg-transparent text-muted border border-hairline hover:border-primary hover:text-primary'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${lead.reachedOut ? 'bg-success' : 'bg-muted'}`} />
          {lead.reachedOut ? 'Reached' : 'Pending'}
        </button>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <button onClick={onEditNotes} className="btn-ghost text-xs" title="Edit notes">✏️</button>
          {lead.phone && (
            <button onClick={onSendWhatsApp} className="btn-ghost text-xs" title="Open WhatsApp">💬</button>
          )}
        </div>
      </td>
    </motion.tr>
  )
}

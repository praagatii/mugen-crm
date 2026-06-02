import { useState } from 'react'
import Modal from '../ui/Modal.jsx'

export default function OutreachQueue({ leads, messages, onClose, onSend }) {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const totalPages = Math.ceil(leads.length / pageSize)
  const currentLeads = leads.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <Modal open={true} onClose={onClose} title="Outreach Queue" subtitle={`${leads.length} leads · Page ${page + 1} of ${totalPages}`} wide>
      <div className="space-y-4">
        {currentLeads.map(lead => {
          const msg = messages[lead.id] || 'Generating...'
          return (
            <div key={lead.id} className="border border-hairline rounded-lg p-4 bg-soft-stone/30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm text-ink">{lead.name}</span>
                {lead.website && (
                  <span className="text-xs text-muted bg-canvas border border-hairline px-3 py-0.5 rounded-full">
                    Has website
                  </span>
                )}
              </div>
              <textarea
                className="w-full bg-canvas border border-hairline rounded-lg p-3 text-sm text-ink resize-none h-32 focus:outline-none focus:border-primary"
                value={msg}
                readOnly
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted">{lead.phone}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-hairline">
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="btn-secondary text-xs disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="btn-secondary text-xs disabled:opacity-30"
          >
            Next →
          </button>
        </div>
        <button onClick={onSend} className="btn-primary text-sm">
          Open WhatsApp ({currentLeads.length})
        </button>
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import Modal from '../ui/Modal.jsx'

export default function NotesModal({ lead, onSave, onClose }) {
  const [text, setText] = useState(lead?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(lead.id, text)
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={!!lead} onClose={onClose} title={lead?.name || 'Notes'} subtitle="Add notes about this lead">
      <textarea
        className="input resize-none h-32 mb-5"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add notes about this lead..."
        autoFocus
      />
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
        <button onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </Modal>
  )
}

import { motion } from 'framer-motion'

export default function Modal({ open, onClose, title, subtitle, children, wide }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`bg-canvas rounded-lg border border-hairline shadow-xl flex flex-col max-h-[85vh] ${wide ? 'max-w-4xl w-full' : 'max-w-lg w-full'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline">
          <div>
            <h2 className="text-lg font-medium text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-soft-stone flex items-center justify-center text-muted hover:text-primary transition-colors text-lg leading-none">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

import { motion } from 'framer-motion'

export default function StatCard({ label, value, color = '#17171c', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2">{label}</p>
      <p className="text-4xl font-light text-primary leading-none">{value}</p>
    </motion.div>
  )
}

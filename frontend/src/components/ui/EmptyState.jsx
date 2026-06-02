export default function EmptyState({ title, description, action }) {
  return (
    <div className="card p-16 text-center">
      <div className="w-14 h-14 rounded-full bg-soft-stone flex items-center justify-center mx-auto mb-4">
        <span className="text-xl text-muted">○</span>
      </div>
      <h3 className="text-lg font-medium text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-md mx-auto mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}

export default function FilterBar({ search, onSearchChange, reachFilter, onReachFilterChange }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1 max-w-sm">
        <input
          className="input pl-10"
          placeholder="Search name, phone, address..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
      </div>
      <div className="filter-group">
        {[
          { value: 'all', label: 'All' },
          { value: 'reached', label: 'Reached' },
          { value: 'unreached', label: 'Not Reached' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => onReachFilterChange(f.value)}
            className={`filter-pill ${reachFilter === f.value ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}

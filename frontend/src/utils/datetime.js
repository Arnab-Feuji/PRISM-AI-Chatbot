/** Parse an ISO string from the API (stored as UTC, often without a timezone suffix). */
export function parseUtcDate(iso) {
  if (!iso) return null
  const s =
    typeof iso === 'string' && !/[Zz]|[+-]\d{2}:\d{2}$/.test(iso) ? `${iso}Z` : iso
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateTime(iso, options) {
  const d = parseUtcDate(iso)
  if (!d) return '—'
  return d.toLocaleString(undefined, options)
}

export function formatDate(iso, options) {
  const d = parseUtcDate(iso)
  if (!d) return '—'
  return d.toLocaleDateString(undefined, options)
}

export function formatTime(iso, options) {
  const d = parseUtcDate(iso)
  if (!d) return '—'
  return d.toLocaleTimeString(undefined, options)
}

/** Topic table style: "8 Jun 2026, 20:11" */
export function formatTopicTimestamp(iso) {
  const d = parseUtcDate(iso)
  if (!d) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatHeaderDate() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatRelativeTime(iso) {
  const date = parseUtcDate(iso)
  if (!date) return 'Never'
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatShortDate(date = new Date()) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

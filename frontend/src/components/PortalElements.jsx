export function PortalStat({ icon, label, value = '—', tone = 'blue' }) {
  return (
    <article className="portal-stat">
      <div className={`portal-stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  )
}

export function PortalPanel({ title, description, children, className = '' }) {
  return (
    <section className={`portal-panel ${className}`}>
      {(title || description) && (
        <div className="portal-panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

export function PortalEmpty({ icon = '✦', title, description, note }) {
  return (
    <div className="portal-empty">
      <div className="portal-empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {note && <small>{note}</small>}
    </div>
  )
}

export function PortalNotice({ children }) {
  return <div className="portal-notice">{children}</div>
}

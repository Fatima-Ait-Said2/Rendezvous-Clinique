import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import '../Portal.css'

function PortalLayout({ roleLabel, title, subtitle, menu, children,profileLabel }) {
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState(menu[0]?.id || 'dashboard')

  const activeItem = menu.find((item) => item.id === activeSection) || menu[0]

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // La session locale est également supprimée si le serveur répond avec une erreur.
    }
  }

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <div className="portal-brand-icon">+</div>
          <div>
            <strong>RendezVous</strong>
            <span>Clinique</span>
          </div>
        </div>

        <div className="portal-menu-label">MENU PRINCIPAL</div>
        <nav className="portal-menu">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`portal-menu-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="portal-menu-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="portal-sidebar-bottom">
          <div className="portal-user">
            <div className="portal-avatar">
              {(user?.prenom || user?.nom || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="portal-user-info">
              <strong>{user?.prenom} {user?.nom}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>
          <button type="button" className="portal-logout" onClick={handleLogout}>
            <span>↪</span> Déconnexion
          </button>
        </div>
      </aside>

      <main className="portal-main">
        <header className="portal-topbar">
          <div>
            <span className="portal-breadcrumb">{roleLabel} /</span>
            <strong>{activeItem?.label || title}</strong>
          </div>
          <div className="portal-topbar-user">{user?.prenom} {user?.nom}</div>
        </header>

        <div className="portal-content">
          <div className="portal-page-heading">
            <div>
              {profileLabel &&(<span className="portal-profile-label">{profileLabel}</span>)}
              <h1>{activeItem?.heading || title}</h1>
              <p>{activeItem?.description || subtitle}</p>
            </div>
          </div>
          {children(activeSection)}
        </div>
      </main>
    </div>
  )
}

export default PortalLayout

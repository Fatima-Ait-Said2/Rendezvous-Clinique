import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import AdminDashboard from './pages/AdminDashboard'

function Unauthorized() {
  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Accès refusé</h1>
        <p>Vous n'avez pas l'autorisation d'accéder à cette page.</p>
      </div>
    </main>
  )
}

function DashboardPlaceholder({ title, description }) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // La session locale est supprimée même si le serveur répond avec une erreur.
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>{title}</h1>
        <p>Bienvenue {user?.prenom} {user?.nom}</p>
        <p>{description}</p>
        <button type="button" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>
    </main>
  )
}

function App() {
  const { isAuthenticated, user } = useAuth()

  const dashboardRoutes = {
    ADMIN: '/admin/dashboard',
    MEDECIN: '/medecin/dashboard',
    ASSISTANT: '/assistant/dashboard',
    PATIENT: '/patient/dashboard',
  }

  const homeRoute = user?.must_change_password
    ? '/change-password'
    : dashboardRoutes[user?.role] || '/unauthorized'

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? homeRoute : '/login'} replace />}
      />

      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={homeRoute} replace /> : <Login />}
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/medecin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['MEDECIN']}>
            <DashboardPlaceholder
              title="Espace Médecin"
              description="Votre espace médecin est en cours de développement."
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ASSISTANT']}>
            <DashboardPlaceholder
              title="Espace Assistant"
              description="Votre espace assistant est en cours de développement."
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <DashboardPlaceholder
              title="Espace Patient"
              description="Votre espace patient est en cours de développement."
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/unauthorized"
        element={
          <ProtectedRoute>
            <Unauthorized />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

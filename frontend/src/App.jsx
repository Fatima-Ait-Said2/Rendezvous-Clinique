import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'

import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ChangePassword from './pages/ChangePassword'
import AdminDashboard from './pages/AdminDashboard'
import MedecinDashboard from './pages/MedecinDashboard'
import AssistantDashboard from './pages/AssistantDashboard'
import PatientDashboard from './pages/PatientDashboard'

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
        element={
          <Navigate
            to={isAuthenticated ? homeRoute : '/login'}
            replace
          />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={homeRoute} replace />
            : <Login />
        }
      />

      <Route
        path="/register"
        element={
          isAuthenticated
            ? <Navigate to={homeRoute} replace />
            : <Register />
        }
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
            <MedecinDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ASSISTANT']}>
            <AssistantDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute allowedRoles={['PATIENT']}>
            <PatientDashboard />
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

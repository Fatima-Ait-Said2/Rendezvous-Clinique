
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }


  if (
    user?.must_change_password &&
    location.pathname !== '/change-password'
  ) {
    return <Navigate to="/change-password" replace />
  }


  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute

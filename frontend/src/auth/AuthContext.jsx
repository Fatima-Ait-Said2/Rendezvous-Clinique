import { createContext, useContext, useState } from 'react'
import api from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    sessionStorage.getItem('token')
  )

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user')

    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const saveAuthentication = (data) => {
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))

    setToken(data.token)
    setUser(data.user)
  }

  const login = async (credentials) => {
    const response = await api.post('/login', credentials)

    saveAuthentication(response.data)

    return {
      user: response.data.user,
      mustChangePassword:
        response.data.must_change_password ??
        response.data.user?.must_change_password ??
        false,
    }
  }

  const register = async (patientData) => {
    const response = await api.post('/register', patientData)

    saveAuthentication(response.data)

    return response.data
  }

  const logout = async () => {
    try {
      await api.post('/logout')
    } finally {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')

      setToken(null)
      setUser(null)
    }
  }

  const changePassword = async (passwordData) => {
    const response = await api.post('/change-password', passwordData)

    const updatedUser = response.data.user

    if (updatedUser) {
      sessionStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    }

    return response.data
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout,
    changePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

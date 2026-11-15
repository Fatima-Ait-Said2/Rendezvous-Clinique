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


  const login = async (credentials) => {
    const response = await api.post('/login', credentials)

    const { token, user, must_change_password } = response.data

    sessionStorage.setItem('token', token)
    sessionStorage.setItem('user', JSON.stringify(user))

    setToken(token)
    setUser(user)

    return {
      user,
      mustChangePassword:
        must_change_password ?? user?.must_change_password ?? false,
    }
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

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const result = await login({ email, password })

      if (result.mustChangePassword) {
        navigate('/change-password')
        return
      }

      const dashboardRoutes = {
        ADMIN: '/admin/dashboard',
        MEDECIN: '/medecin/dashboard',
        ASSISTANT: '/assistant/dashboard',
        PATIENT: '/patient/dashboard',
      }

      navigate(dashboardRoutes[result.user.role] || '/unauthorized')
    } catch (err) {
      const responseData = err.response?.data

      const validationErrors = responseData?.errors
        ? Object.values(responseData.errors).flat()
        : []

      setError(
        validationErrors[0] ||
        responseData?.message ||
        'Une erreur est survenue. Veuillez réessayer.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>RendezVousClinique</h1>
        <p>Connectez-vous à votre espace</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="exemple@clinique.ma"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="register-link">
          <span>Vous êtes patient et vous n'avez pas de compte ?</span>
          <Link to="/register">Créer un compte</Link>
        </div>
      </div>
    </main>
  )
}

export default Login

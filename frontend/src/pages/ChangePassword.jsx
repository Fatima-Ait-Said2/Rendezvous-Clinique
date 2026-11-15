import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function ChangePassword() {
  const { changePassword, user } = useAuth()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (password !== passwordConfirmation) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)

    try {
      await changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })

      setSuccess('Mot de passe modifié avec succès.')

      const dashboardRoutes = {
        ADMIN: '/admin/dashboard',
        MEDECIN: '/medecin/dashboard',
        ASSISTANT: '/assistant/dashboard',
        PATIENT: '/patient/dashboard',
      }

      navigate(dashboardRoutes[user?.role] || '/unauthorized')
    } catch (err) {
      const responseData = err.response?.data

      const validationErrors = responseData?.errors
        ? Object.values(responseData.errors).flat()
        : []

      setError(
        validationErrors[0] ||
        responseData?.message ||
        'Une erreur est survenue.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Changer le mot de passe</h1>
        <p>Veuillez choisir un nouveau mot de passe.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="currentPassword">Mot de passe actuel</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Nouveau mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirmation">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="passwordConfirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Modification en cours...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default ChangePassword

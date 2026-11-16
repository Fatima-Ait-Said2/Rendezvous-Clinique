import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    password_confirmation: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await register(form)
      navigate('/patient/dashboard', { replace: true })
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
        <p>Créer votre compte patient</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nom">Nom</label>
            <input
              id="nom"
              name="nom"
              value={form.nom}
              onChange={handleChange}
              placeholder="Votre nom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="prenom">Prénom</label>
            <input
              id="prenom"
              name="prenom"
              value={form.prenom}
              onChange={handleChange}
              placeholder="Votre prénom"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="exemple@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telephone">Téléphone</label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              value={form.telephone}
              onChange={handleChange}
              placeholder="06XXXXXXXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password_confirmation">
              Confirmer le mot de passe
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              value={form.password_confirmation}
              onChange={handleChange}
              placeholder="Confirmez votre mot de passe"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        </form>

        <p>
          Vous avez déjà un compte ?{' '}
          <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}

export default Register

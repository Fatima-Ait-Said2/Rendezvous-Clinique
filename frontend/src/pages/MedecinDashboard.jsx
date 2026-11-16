
import { useEffect, useState } from 'react'
import api from '../api/api'
import PortalLayout from '../components/PortalLayout'

const jours = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
]

const menu = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '🏠', heading: 'Tableau de bord', description: 'Vue générale de votre activité médicale.' },
  { id: 'rendez-vous', label: 'Mes rendez-vous', icon: '📅', heading: 'Mes rendez-vous', description: 'Consultez et gérez les rendez-vous de vos patients.' },
  { id: 'horaires', label: 'Horaires de travail', icon: '🕒', heading: 'Mes horaires de travail', description: 'Définissez vos jours et heures de consultation.' },
  { id: 'creneaux', label: 'Créneaux disponibles', icon: '⏰', heading: 'Créneaux disponibles', description: 'Générez et consultez vos créneaux.' },
  { id: 'consultations', label: 'Consultations', icon: '🩺', heading: 'Consultations', description: 'Retrouvez vos consultations.' },
  { id: 'ordonnances', label: 'Ordonnances', icon: '💊', heading: 'Ordonnances', description: 'Gérez vos prescriptions médicales.' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', heading: 'Notifications', description: 'Suivez les informations importantes.' },
]

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 20,
  marginBottom: 20,
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  marginTop: 6,
  boxSizing: 'border-box',
}

const buttonStyle = {
  padding: '10px 16px',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
  background: '#2563eb',
  color: 'white',
  fontWeight: 600,
}

const secondaryButton = {
  ...buttonStyle,
  background: '#64748b',
}

const initialForm = {
  jour_semaine: '1',
  heure_debut: '09:00',
  heure_fin: '17:00',
  duree_rendez_vous: '30',
}

function localDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function MedecinContent({ section }) {
  const [dashboard, setDashboard] = useState(null)
  const [horaires, setHoraires] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [dateDebut, setDateDebut] = useState(localDate(new Date()))
  const [dateFin, setDateFin] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return localDate(date)
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadDashboard() {
    const response = await api.get('/medecin/dashboard')
    setDashboard(response.data)
  }

  async function loadHoraires() {
    const response = await api.get('/medecin/horaires')
    setHoraires(response.data)
  }

  async function loadCreneaux() {
    const response = await api.get('/medecin/creneaux')
    setCreneaux(response.data.data || [])
  }

  useEffect(() => {
    setError('')
    setMessage('')
    setLoading(true)

    let request

    if (section === 'dashboard') request = loadDashboard()
    else if (section === 'horaires') request = loadHoraires()
    else if (section === 'creneaux') request = loadCreneaux()
    else request = Promise.resolve()

    request
      .catch((err) => {
        setError(err.response?.data?.message || 'Une erreur est survenue.')
      })
      .finally(() => setLoading(false))
  }, [section])

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
  }

  async function saveHoraire(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const data = {
      jour_semaine: Number(form.jour_semaine),
      heure_debut: form.heure_debut,
      heure_fin: form.heure_fin,
      duree_rendez_vous: Number(form.duree_rendez_vous),
    }

    try {
      if (editingId) {
        await api.put(`/medecin/horaires/${editingId}`, data)
        setMessage('Horaire modifié avec succès.')
      } else {
        await api.post('/medecin/horaires', data)
        setMessage('Horaire ajouté avec succès.')
      }

      resetForm()
      await loadHoraires()
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err.response?.data?.message || 'Impossible d’enregistrer cet horaire.'
      )
    }
  }

  function editHoraire(horaire) {
    setEditingId(horaire.id)
    setForm({
      jour_semaine: String(horaire.jour_semaine),
      heure_debut: horaire.heure_debut.slice(0, 5),
      heure_fin: horaire.heure_fin.slice(0, 5),
      duree_rendez_vous: String(horaire.duree_rendez_vous),
    })
    setError('')
    setMessage('')
  }

  async function deleteHoraire(id) {
    if (!window.confirm('Voulez-vous vraiment supprimer cet horaire ?')) return

    setError('')
    setMessage('')

    try {
      await api.delete(`/medecin/horaires/${id}`)
      setMessage('Horaire supprimé avec succès.')
      if (editingId === id) resetForm()
      await loadHoraires()
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de supprimer cet horaire.')
    }
  }

  async function generateCreneaux(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      const response = await api.post('/medecin/creneaux/generer', {
        date_debut: dateDebut,
        date_fin: dateFin,
      })

      setMessage(
        `${response.data.creneaux_crees} créneau(x) créé(s) avec succès.`
      )
      await loadCreneaux()
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : err.response?.data?.message || 'Impossible de générer les créneaux.'
      )
    }
  }

  return (
    <div>
      {error && (
        <div style={{ ...cardStyle, color: '#b91c1c', background: '#fef2f2' }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ ...cardStyle, color: '#166534', background: '#f0fdf4' }}>
          {message}
        </div>
      )}

      {loading && <p>Chargement...</p>}

      {section === 'dashboard' && !loading && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}>
            {[
              ['Rendez-vous aujourd’hui', dashboard?.rendez_vous_aujourdhui],
              ['En attente', dashboard?.rendez_vous_en_attente],
              ['Consultations terminées', dashboard?.consultations_terminees],
              ['Notifications non lues', dashboard?.notifications_non_lues],
            ].map(([label, value]) => (
              <div key={label} style={cardStyle}>
                <p style={{ color: '#64748b', margin: 0 }}>{label}</p>
                <h2 style={{ fontSize: 30, marginBottom: 0 }}>
                  {value ?? '—'}
                </h2>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3>Bienvenue dans votre espace médecin</h3>
            <p>Gérez vos horaires et vos créneaux de consultation depuis cet espace.</p>
          </div>
        </>
      )}

      {section === 'horaires' && (
        <>
          <div style={cardStyle}>
            <h3>{editingId ? 'Modifier un horaire' : 'Ajouter un horaire'}</h3>

            <form onSubmit={saveHoraire}>
              <label>Jour de travail</label>
              <select
                name="jour_semaine"
                value={form.jour_semaine}
                onChange={updateForm}
                style={inputStyle}
              >
                {jours.map((jour) => (
                  <option key={jour.value} value={jour.value}>
                    {jour.label}
                  </option>
                ))}
              </select>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
                marginTop: 12,
              }}>
                <div>
                  <label>Heure de début</label>
                  <input
                    type="time"
                    name="heure_debut"
                    value={form.heure_debut}
                    onChange={updateForm}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Heure de fin</label>
                  <input
                    type="time"
                    name="heure_fin"
                    value={form.heure_fin}
                    onChange={updateForm}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Durée (minutes)</label>
                  <input
                    type="number"
                    name="duree_rendez_vous"
                    min="5"
                    max="240"
                    value={form.duree_rendez_vous}
                    onChange={updateForm}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" style={buttonStyle}>
                  {editingId ? 'Enregistrer les modifications' : 'Ajouter'}
                </button>

                {editingId && (
                  <button type="button" onClick={resetForm} style={secondaryButton}>
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Mes horaires de travail</h3>

            {horaires.length === 0 ? (
              <p>Aucun horaire enregistré.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th align="left">Jour</th>
                      <th align="left">Début</th>
                      <th align="left">Fin</th>
                      <th align="left">Durée</th>
                      <th align="left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horaires.map((horaire) => (
                      <tr key={horaire.id}>
                        <td>{jours.find(j => j.value === horaire.jour_semaine)?.label}</td>
                        <td>{horaire.heure_debut.slice(0, 5)}</td>
                        <td>{horaire.heure_fin.slice(0, 5)}</td>
                        <td>{horaire.duree_rendez_vous} min</td>
                        <td>
                          <button
                            onClick={() => editHoraire(horaire)}
                            style={{ ...buttonStyle, margin: 4 }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteHoraire(horaire.id)}
                            style={{ ...buttonStyle, background: '#dc2626', margin: 4 }}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'creneaux' && (
        <>
          <div style={cardStyle}>
            <h3>Générer les créneaux disponibles</h3>
            <p>Les créneaux seront créés à partir de vos horaires de travail.</p>

            <form onSubmit={generateCreneaux}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
              }}>
                <div>
                  <label>Date de début</label>
                  <input
                    type="date"
                    value={dateDebut}
                    min={localDate(new Date())}
                    onChange={(e) => setDateDebut(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label>Date de fin</label>
                  <input
                    type="date"
                    value={dateFin}
                    min={dateDebut}
                    onChange={(e) => setDateFin(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <button type="submit" style={{ ...buttonStyle, marginTop: 16 }}>
                Générer les créneaux
              </button>
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Mes créneaux</h3>

            {creneaux.length === 0 ? (
              <p>Aucun créneau disponible pour le moment.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th align="left">Date</th>
                      <th align="left">Début</th>
                      <th align="left">Fin</th>
                      <th align="left">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creneaux.map((creneau) => (
                      <tr key={creneau.id}>
                        <td>{String(creneau.date_creneau).slice(0, 10)}</td>
                        <td>{creneau.heure_debut.slice(0, 5)}</td>
                        <td>{creneau.heure_fin.slice(0, 5)}</td>
                        <td>
                          {creneau.disponible ? 'Disponible' : 'Indisponible'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!['dashboard', 'horaires', 'creneaux'].includes(section) && (
        <div style={cardStyle}>
          <h3>{menu.find(item => item.id === section)?.heading}</h3>
          <p>Cette rubrique sera développée dans la prochaine étape.</p>
        </div>
      )}
    </div>
  )
}

function MedecinDashboard() {
  return (
    <PortalLayout
      roleLabel="Espace médecin"
      title="Espace médecin"
      subtitle="Bienvenue dans votre espace professionnel."
      menu={menu}
    >
      {(section) => <MedecinContent section={section} />}
    </PortalLayout>
  )
}

export default MedecinDashboard

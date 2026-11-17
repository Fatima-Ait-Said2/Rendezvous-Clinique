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
  { id: 'dashboard', label: 'Tableau de bord', icon: '📊', heading: 'Tableau de bord', description: 'Vue générale de votre activité médicale.' },
  { id: 'rendez-vous', label: 'Mes rendez-vous', icon: '📅', heading: 'Mes rendez-vous', description: 'Consultez et gérez les rendez-vous de vos patients.' },
  { id: 'horaires', label: 'Horaires de travail', icon: '🕒', heading: 'Mes horaires de travail', description: 'Définissez vos jours et heures de consultation.' },
  { id: 'creneaux', label: 'Créneaux disponibles', icon: '⏰', heading: 'Créneaux disponibles', description: 'Générez et consultez vos créneaux.' },
  { id: 'dossiers', label: 'Dossiers médicaux', icon: '📁', heading: 'Dossiers médicaux', description: 'Consultez les dossiers de vos patients.' },
  { id: 'consultations', label: 'Consultations', icon: '🩺', heading: 'Consultations', description: 'Gérez vos consultations médicales.' },
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
  marginBottom: 12,
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
  margin: 3,
}

const secondaryButton = {
  ...buttonStyle,
  background: '#64748b',
}

const dangerButton = {
  ...buttonStyle,
  background: '#dc2626',
}

const successButton = {
  ...buttonStyle,
  background: '#15803d',
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

function responseList(response) {
  const data = response?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (Array.isArray(data?.data?.data)) return data.data.data
  return []
}

function patientName(item) {
  const user = item?.patient?.user || item?.user || {}
  const name = `${user.prenom || ''} ${user.nom || ''}`.trim()
  return name || 'Patient'
}

function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('fr-FR')
}

function timeLabel(value) {
  return value ? String(value).slice(0, 5) : '—'
}

function errorMessage(err) {
  if (err.response?.data?.errors) {
    return Object.values(err.response.data.errors).flat().join(' ')
  }
  return err.response?.data?.message || 'Une erreur est survenue.'
}

function MedecinContent({ section }) {
  const [dashboard, setDashboard] = useState(null)
  const [horaires, setHoraires] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [rendezVous, setRendezVous] = useState([])
  const [dossiers, setDossiers] = useState([])
  const [dossierDetail, setDossierDetail] = useState(null)
  const [consultations, setConsultations] = useState([])
  const [ordonnances, setOrdonnances] = useState([])
  const [notifications, setNotifications] = useState([])
  const [creneauxDisponibles, setCreneauxDisponibles] = useState([])

  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)

  const [dateDebut, setDateDebut] = useState(localDate(new Date()))
  const [dateFin, setDateFin] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return localDate(date)
  })

  const [filtreStatut, setFiltreStatut] = useState('')
  const [recherche, setRecherche] = useState('')
  const [selectedRendezVous, setSelectedRendezVous] = useState('')
  const [selectedCreneau, setSelectedCreneau] = useState('')

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedConsultation, setSelectedConsultation] = useState('')
  const [editingConsultationId, setEditingConsultationId] = useState(null)
  const [diagnostic, setDiagnostic] = useState('')
  const [notes, setNotes] = useState('')

  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null)
  const [ordonnanceConsultation, setOrdonnanceConsultation] = useState('')
  const [ordonnanceInstructions, setOrdonnanceInstructions] = useState('')
  const [lignes, setLignes] = useState([
    { nom_medicament: '', dosage: '', frequence: '', duree: '', quantite: '', instructions: '' },
  ])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadDashboard() {
    const response = await api.get('/medecin/dashboard')
    setDashboard(response.data)
  }

  async function loadHoraires() {
    const response = await api.get('/medecin/horaires')
    setHoraires(responseList(response))
  }

  async function loadCreneaux() {
    const response = await api.get('/medecin/creneaux')
    setCreneaux(responseList(response))
  }

  async function loadRendezVous() {
    const params = {}
    if (filtreStatut) params.statut = filtreStatut
    if (recherche.trim()) params.search = recherche.trim()

    const response = await api.get('/medecin/rendez-vous', { params })
    setRendezVous(responseList(response))
  }

  async function loadDossiers() {
    const response = await api.get('/medecin/dossiers')
    setDossiers(responseList(response))
  }

  async function loadConsultations() {
    const response = await api.get('/medecin/consultations')
    setConsultations(responseList(response))
  }

  async function loadOrdonnances() {
    const response = await api.get('/medecin/ordonnances')
    setOrdonnances(responseList(response))
  }

  async function loadNotifications() {
    const response = await api.get('/medecin/notifications')
    setNotifications(responseList(response))
  }

  async function loadCreneauxDisponibles() {
    const response = await api.get('/medecin/creneaux-disponibles')
    setCreneauxDisponibles(responseList(response))
  }

  async function loadSection() {
    setError('')
    setMessage('')
    setLoading(true)

    try {
      if (section === 'dashboard') await loadDashboard()
      if (section === 'horaires') await loadHoraires()
      if (section === 'creneaux') await loadCreneaux()
      if (section === 'rendez-vous') await loadRendezVous()
      if (section === 'dossiers') await loadDossiers()
      if (section === 'consultations') await loadConsultations()
      if (section === 'ordonnances') {
        await Promise.all([loadOrdonnances(), loadConsultations()])
      }
      if (section === 'notifications') await loadNotifications()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSection()
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
      setError(errorMessage(err))
    }
  }

  function editHoraire(horaire) {
    setEditingId(horaire.id)
    setForm({
      jour_semaine: String(horaire.jour_semaine),
      heure_debut: timeLabel(horaire.heure_debut),
      heure_fin: timeLabel(horaire.heure_fin),
      duree_rendez_vous: String(horaire.duree_rendez_vous),
    })
    setError('')
    setMessage('')
  }

  async function deleteHoraire(id) {
    if (!window.confirm('Voulez-vous vraiment supprimer cet horaire ?')) return

    try {
      await api.delete(`/medecin/horaires/${id}`)
      setMessage('Horaire supprimé avec succès.')
      if (editingId === id) resetForm()
      await loadHoraires()
    } catch (err) {
      setError(errorMessage(err))
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

      setMessage(`${response.data.creneaux_crees ?? 0} créneau(x) créé(s) avec succès.`)
      await loadCreneaux()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function confirmRendezVous(id) {
    if (!window.confirm('Confirmer ce rendez-vous ?')) return

    try {
      await api.patch(`/medecin/rendez-vous/${id}/confirmer`)
      setMessage('Rendez-vous confirmé.')
      await loadRendezVous()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function cancelRendezVous(id) {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return

    try {
      await api.patch(`/medecin/rendez-vous/${id}/annuler`)
      setMessage('Rendez-vous annulé.')
      await loadRendezVous()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function prepareReprogramming(rendezVousId) {
    setError('')
    setMessage('')
    setSelectedRendezVous(String(rendezVousId))
    setSelectedCreneau('')

    try {
      const response = await api.get('/medecin/creneaux-disponibles')
      setCreneauxDisponibles(responseList(response))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function reprogramRendezVous(event) {
    event.preventDefault()
    if (!selectedRendezVous || !selectedCreneau) {
      setError('Veuillez sélectionner un créneau.')
      return
    }

    try {
      await api.post(`/medecin/rendez-vous/${selectedRendezVous}/reprogrammer`, {
        creneau_id: Number(selectedCreneau),
      })
      setMessage('Demande de reprogrammation enregistrée. Le nouveau rendez-vous est en attente.')
      setSelectedRendezVous('')
      setSelectedCreneau('')
      await loadRendezVous()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function openDossier(patientId) {
    setError('')
    setSelectedPatient(patientId)
    setDossierDetail(null)

    try {
      const response = await api.get(`/medecin/dossiers/${patientId}`)
      setDossierDetail(response.data)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function resetConsultationForm() {
    setEditingConsultationId(null)
    setSelectedRendezVous('')
    setDiagnostic('')
    setNotes('')
  }

  function editConsultation(consultation) {
    setEditingConsultationId(consultation.id)
    setDiagnostic(consultation.diagnostic || '')
    setNotes(consultation.notes || '')
    setMessage('Modifiez les informations puis enregistrez.')
  }

  async function saveConsultation(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      if (editingConsultationId) {
        await api.put(`/medecin/consultations/${editingConsultationId}`, {
          diagnostic,
          notes,
        })
        setMessage('Consultation modifiée avec succès.')
      } else {
        if (!selectedRendezVous) {
          setError('Veuillez sélectionner un rendez-vous confirmé.')
          return
        }

        await api.post(`/medecin/rendez-vous/${selectedRendezVous}/consultation`, {
          diagnostic,
          notes,
        })
        setMessage('Consultation enregistrée avec succès.')
      }

      resetConsultationForm()
      await loadConsultations()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function resetOrdonnanceForm() {
    setSelectedOrdonnance(null)
    setOrdonnanceConsultation('')
    setOrdonnanceInstructions('')
    setLignes([
      { nom_medicament: '', dosage: '', frequence: '', duree: '', quantite: '', instructions: '' },
    ])
  }

  function updateLigne(index, field, value) {
    setLignes(current =>
      current.map((ligne, i) => i === index ? { ...ligne, [field]: value } : ligne)
    )
  }

  function addLigne() {
    setLignes(current => [
      ...current,
      { nom_medicament: '', dosage: '', frequence: '', duree: '', quantite: '', instructions: '' },
    ])
  }

  function removeLigne(index) {
    setLignes(current => current.filter((_, i) => i !== index))
  }

  function editOrdonnance(ordonnance) {
    setSelectedOrdonnance(ordonnance)
    setOrdonnanceConsultation(String(ordonnance.consultation_id || ordonnance.consultation?.id || ''))
    setOrdonnanceInstructions(ordonnance.instructions || '')
    setLignes(
      ordonnance.lignes?.length
        ? ordonnance.lignes.map(ligne => ({
            nom_medicament: ligne.nom_medicament || '',
            dosage: ligne.dosage || '',
            frequence: ligne.frequence || '',
            duree: ligne.duree || '',
            quantite: ligne.quantite ?? '',
            instructions: ligne.instructions || '',
          }))
        : [{ nom_medicament: '', dosage: '', frequence: '', duree: '', quantite: '', instructions: '' }]
    )
  }

  async function saveOrdonnance(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const lignesValides = lignes.filter(ligne => ligne.nom_medicament.trim())

    if (!lignesValides.length) {
      setError('Ajoutez au moins un médicament.')
      return
    }

    const data = {
      instructions: ordonnanceInstructions,
      lignes: lignesValides.map(ligne => ({
        ...ligne,
        quantite: ligne.quantite === '' ? null : Number(ligne.quantite),
      })),
    }

    try {
      if (selectedOrdonnance) {
        await api.put(`/medecin/ordonnances/${selectedOrdonnance.id}`, data)
        setMessage('Ordonnance modifiée avec succès.')
      } else {
        if (!ordonnanceConsultation) {
          setError('Veuillez sélectionner une consultation.')
          return
        }
        await api.post(`/medecin/consultations/${ordonnanceConsultation}/ordonnances`, data)
        setMessage('Ordonnance créée avec succès.')
      }

      resetOrdonnanceForm()
      await loadOrdonnances()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function markNotificationRead(id) {
    try {
      await api.patch(`/medecin/notifications/${id}/lue`)
      await loadNotifications()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.patch('/medecin/notifications/lire-toutes')
      setMessage('Toutes les notifications ont été marquées comme lues.')
      await loadNotifications()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function renderRendezVousTable(items) {
    if (!items.length) return <p>Aucun rendez-vous trouvé.</p>

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              <th align="left">Patient</th>
              <th align="left">Date</th>
              <th align="left">Heure</th>
              <th align="left">Motif</th>
              <th align="left">Statut</th>
              <th align="left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td>{patientName(item)}</td>
                <td>{dateLabel(item.creneau?.date_creneau || item.date_creneau)}</td>
                <td>{timeLabel(item.creneau?.heure_debut)}</td>
                <td>{item.motif || '—'}</td>
                <td>{item.statut || '—'}</td>
                <td>
                  {item.statut === 'EN_ATTENTE' && (
                    <button style={successButton} onClick={() => confirmRendezVous(item.id)}>
                      Confirmer
                    </button>
                  )}
                  {['EN_ATTENTE', 'CONFIRME'].includes(item.statut) && (
                    <>
                      <button style={dangerButton} onClick={() => cancelRendezVous(item.id)}>
                        Annuler
                      </button>
                      <button style={secondaryButton} onClick={() => prepareReprogramming(item.id)}>
                        Reprogrammer
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
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
                <h2 style={{ fontSize: 30, marginBottom: 0 }}>{value ?? '—'}</h2>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3>Bienvenue dans votre espace médecin</h3>
            <p>Gérez vos rendez-vous, vos horaires, vos consultations et les dossiers de vos patients.</p>
          </div>
        </>
      )}

      {section === 'horaires' && (
        <>
          <div style={cardStyle}>
            <h3>{editingId ? 'Modifier un horaire' : 'Ajouter un horaire'}</h3>
            <form onSubmit={saveHoraire}>
              <label>Jour de travail</label>
              <select name="jour_semaine" value={form.jour_semaine} onChange={updateForm} style={inputStyle}>
                {jours.map(jour => (
                  <option key={jour.value} value={jour.value}>{jour.label}</option>
                ))}
              </select>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 12,
              }}>
                <div>
                  <label>Heure de début</label>
                  <input type="time" name="heure_debut" value={form.heure_debut} onChange={updateForm} required style={inputStyle} />
                </div>
                <div>
                  <label>Heure de fin</label>
                  <input type="time" name="heure_fin" value={form.heure_fin} onChange={updateForm} required style={inputStyle} />
                </div>
                <div>
                  <label>Durée (minutes)</label>
                  <input type="number" name="duree_rendez_vous" min="5" max="240" value={form.duree_rendez_vous} onChange={updateForm} required style={inputStyle} />
                </div>
              </div>

              <button type="submit" style={buttonStyle}>
                {editingId ? 'Enregistrer les modifications' : 'Ajouter'}
              </button>
              {editingId && <button type="button" onClick={resetForm} style={secondaryButton}>Annuler</button>}
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Mes horaires de travail</h3>
            {horaires.length === 0 ? <p>Aucun horaire enregistré.</p> : (
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
                    {horaires.map(horaire => (
                      <tr key={horaire.id}>
                        <td>{jours.find(j => j.value === horaire.jour_semaine)?.label}</td>
                        <td>{timeLabel(horaire.heure_debut)}</td>
                        <td>{timeLabel(horaire.heure_fin)}</td>
                        <td>{horaire.duree_rendez_vous} min</td>
                        <td>
                          <button onClick={() => editHoraire(horaire)} style={buttonStyle}>Modifier</button>
                          <button onClick={() => deleteHoraire(horaire.id)} style={dangerButton}>Supprimer</button>
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
                  <input type="date" value={dateDebut} min={localDate(new Date())} onChange={e => setDateDebut(e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label>Date de fin</label>
                  <input type="date" value={dateFin} min={dateDebut} onChange={e => setDateFin(e.target.value)} required style={inputStyle} />
                </div>
              </div>
              <button type="submit" style={buttonStyle}>Générer les créneaux</button>
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Mes créneaux</h3>
            {creneaux.length === 0 ? <p>Aucun créneau disponible pour le moment.</p> : (
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
                    {creneaux.map(creneau => (
                      <tr key={creneau.id}>
                        <td>{dateLabel(creneau.date_creneau)}</td>
                        <td>{timeLabel(creneau.heure_debut)}</td>
                        <td>{timeLabel(creneau.heure_fin)}</td>
                        <td>{creneau.disponible ? 'Disponible' : 'Indisponible'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {section === 'rendez-vous' && (
        <>
          <div style={cardStyle}>
            <h3>Recherche et filtrage</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}>
              <input
                placeholder="Rechercher un patient..."
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                style={inputStyle}
              />
              <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} style={inputStyle}>
                <option value="">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="CONFIRME">Confirmé</option>
                <option value="ANNULE">Annulé</option>
                <option value="TERMINE">Terminé</option>
              </select>
            </div>
            <button style={buttonStyle} onClick={loadRendezVous}>Rechercher</button>
            <button style={secondaryButton} onClick={() => {
              setRecherche('')
              setFiltreStatut('')
              setTimeout(loadRendezVous, 0)
            }}>Réinitialiser</button>
          </div>

          <div style={cardStyle}>
            <h3>Liste de mes rendez-vous</h3>
            {renderRendezVousTable(rendezVous)}
          </div>

          {selectedRendezVous && (
            <div style={cardStyle}>
              <h3>Reprogrammer le rendez-vous</h3>
              <form onSubmit={reprogramRendezVous}>
                <label>Nouveau créneau disponible</label>
                <select value={selectedCreneau} onChange={e => setSelectedCreneau(e.target.value)} required style={inputStyle}>
                  <option value="">Sélectionner un créneau</option>
                  {creneauxDisponibles.map(creneau => (
                    <option key={creneau.id} value={creneau.id}>
                      {dateLabel(creneau.date_creneau)} — {timeLabel(creneau.heure_debut)} à {timeLabel(creneau.heure_fin)}
                    </option>
                  ))}
                </select>
                {creneauxDisponibles.length === 0 && <p>Aucun créneau disponible trouvé.</p>}
                <button type="submit" style={buttonStyle} disabled={!selectedCreneau}>Valider la reprogrammation</button>
                <button type="button" style={secondaryButton} onClick={() => setSelectedRendezVous('')}>Fermer</button>
              </form>
            </div>
          )}
        </>
      )}

      {section === 'dossiers' && (
        <>
          <div style={cardStyle}>
            <h3>Patients suivis</h3>
            {dossiers.length === 0 ? <p>Aucun dossier médical trouvé.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th align="left">Patient</th>
                      <th align="left">Email</th>
                      <th align="left">Téléphone</th>
                      <th align="left">Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.map(item => {
                      const user = item.patient?.user || item.user || item
                      const id = item.patient?.id || item.patient_id || item.id
                      return (
                        <tr key={id}>
                          <td>{`${user.prenom || ''} ${user.nom || ''}`.trim() || 'Patient'}</td>
                          <td>{user.email || '—'}</td>
                          <td>{user.telephone || '—'}</td>
                          <td>
                            <button style={buttonStyle} onClick={() => openDossier(id)}>Consulter</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {dossierDetail && (
            <div style={cardStyle}>
              <h3>Dossier médical du patient</h3>
              <button style={secondaryButton} onClick={() => {
                setDossierDetail(null)
                setSelectedPatient(null)
              }}>Fermer le dossier</button>

              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {JSON.stringify(dossierDetail.patient || dossierDetail.dossier || {}, null, 2)}
              </pre>

              <h4>Historique des consultations</h4>
              {(() => {
                const items = dossierDetail.consultations || dossierDetail.dossier?.consultations || []
                return items.length ? items.map(item => (
                  <div key={item.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
                    <strong>{dateLabel(item.date_consultation)}</strong>
                    <p><strong>Diagnostic :</strong> {item.diagnostic || '—'}</p>
                    <p><strong>Notes :</strong> {item.notes || '—'}</p>
                    {(item.ordonnances || []).map(ordonnance => (
                      <div key={ordonnance.id}>
                        <strong>Ordonnance :</strong> {ordonnance.instructions || '—'}
                        {(ordonnance.lignes || []).map(ligne => (
                          <p key={ligne.id}>{ligne.nom_medicament} — {ligne.dosage} — {ligne.frequence} — {ligne.duree}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )) : <p>Aucune consultation dans ce dossier.</p>
              })()}
            </div>
          )}
        </>
      )}

      {section === 'consultations' && (
        <>
          <div style={cardStyle}>
            <h3>{editingConsultationId ? 'Modifier une consultation' : 'Nouvelle consultation'}</h3>
            <form onSubmit={saveConsultation}>
              {!editingConsultationId && (
                <>
                  <label>Rendez-vous confirmé</label>
                  <select value={selectedRendezVous} onChange={e => setSelectedRendezVous(e.target.value)} required style={inputStyle}>
                    <option value="">Sélectionner un rendez-vous</option>
                    {rendezVous.filter(item => item.statut === 'CONFIRME').map(item => (
                      <option key={item.id} value={item.id}>
                        {patientName(item)} — {dateLabel(item.creneau?.date_creneau)}
                      </option>
                    ))}
                  </select>
                  {rendezVous.length === 0 && (
                    <button type="button" style={secondaryButton} onClick={loadRendezVous}>Charger les rendez-vous</button>
                  )}
                </>
              )}

              <label>Diagnostic</label>
              <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)} required rows={4} style={inputStyle} />

              <label>Notes médicales</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} style={inputStyle} />

              <button type="submit" style={buttonStyle}>Enregistrer</button>
              {editingConsultationId && (
                <button type="button" style={secondaryButton} onClick={resetConsultationForm}>Annuler la modification</button>
              )}
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Historique des consultations</h3>
            {consultations.length === 0 ? <p>Aucune consultation enregistrée.</p> : consultations.map(item => (
              <div key={item.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
                <strong>{patientName(item.rendez_vous || item)}</strong>
                <p>Date : {dateLabel(item.date_consultation)}</p>
                <p>Diagnostic : {item.diagnostic || '—'}</p>
                <p>Notes : {item.notes || '—'}</p>
                <button style={buttonStyle} onClick={() => editConsultation(item)}>Modifier</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'ordonnances' && (
        <>
          <div style={cardStyle}>
            <h3>{selectedOrdonnance ? 'Modifier une ordonnance' : 'Nouvelle ordonnance'}</h3>
            <form onSubmit={saveOrdonnance}>
              {!selectedOrdonnance && (
                <>
                  <label>Consultation</label>
                  <select value={ordonnanceConsultation} onChange={e => setOrdonnanceConsultation(e.target.value)} required style={inputStyle}>
                    <option value="">Sélectionner une consultation</option>
                    {consultations.map(item => (
                      <option key={item.id} value={item.id}>
                        Consultation #{item.id} — {dateLabel(item.date_consultation)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label>Instructions générales</label>
              <textarea value={ordonnanceInstructions} onChange={e => setOrdonnanceInstructions(e.target.value)} rows={3} style={inputStyle} />

              <h4>Médicaments</h4>
              {lignes.map((ligne, index) => (
                <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <label>Nom du médicament</label>
                  <input value={ligne.nom_medicament} onChange={e => updateLigne(index, 'nom_medicament', e.target.value)} required style={inputStyle} />

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: 10,
                  }}>
                    <div>
                      <label>Dosage</label>
                      <input value={ligne.dosage} onChange={e => updateLigne(index, 'dosage', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label>Fréquence</label>
                      <input value={ligne.frequence} onChange={e => updateLigne(index, 'frequence', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label>Durée</label>
                      <input value={ligne.duree} onChange={e => updateLigne(index, 'duree', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label>Quantité</label>
                      <input type="number" min="0" value={ligne.quantite} onChange={e => updateLigne(index, 'quantite', e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <label>Instructions du médicament</label>
                  <input value={ligne.instructions} onChange={e => updateLigne(index, 'instructions', e.target.value)} style={inputStyle} />

                  {lignes.length > 1 && (
                    <button type="button" style={dangerButton} onClick={() => removeLigne(index)}>Supprimer ce médicament</button>
                  )}
                </div>
              ))}

              <button type="button" style={secondaryButton} onClick={addLigne}>+ Ajouter un médicament</button>
              <button type="submit" style={buttonStyle}>Enregistrer l'ordonnance</button>
              {selectedOrdonnance && <button type="button" style={secondaryButton} onClick={resetOrdonnanceForm}>Annuler</button>}
            </form>
          </div>

          <div style={cardStyle}>
            <h3>Mes ordonnances</h3>
            {ordonnances.length === 0 ? <p>Aucune ordonnance enregistrée.</p> : ordonnances.map(item => (
              <div key={item.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
                <strong>Ordonnance #{item.id}</strong>
                <p>Date : {dateLabel(item.date_creation)}</p>
                <p>Instructions : {item.instructions || '—'}</p>
                {(item.lignes || []).map(ligne => (
                  <p key={ligne.id}>{ligne.nom_medicament} — {ligne.dosage} — {ligne.frequence} — {ligne.duree}</p>
                ))}
                <button style={buttonStyle} onClick={() => editOrdonnance(item)}>Modifier</button>
              </div>
            ))}
          </div>
        </>
      )}

      {section === 'notifications' && (
        <>
          <div style={cardStyle}>
            <h3>Mes notifications</h3>
            <button style={buttonStyle} onClick={markAllNotificationsRead}>Tout marquer comme lu</button>

            {notifications.length === 0 ? <p>Aucune notification.</p> : notifications.map(item => (
              <div key={item.id} style={{
                borderTop: '1px solid #e5e7eb',
                padding: 14,
                background: item.lu ? '#fff' : '#eff6ff',
                borderRadius: 8,
                marginTop: 10,
              }}>
                <strong>{item.titre || 'Notification'}</strong>
                <p>{item.message}</p>
                <small>{dateLabel(item.date_envoi || item.created_at)} — {item.type || ''}</small>
                {!item.lu && (
                  <div>
                    <button style={successButton} onClick={() => markNotificationRead(item.id)}>Marquer comme lue</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
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

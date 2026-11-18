import { useEffect, useMemo, useState } from 'react'
import api from '../api/api'
import PortalLayout from '../components/PortalLayout'
import '../Assistant.css'
import {
  PortalNotice,
  PortalPanel,
  PortalStat,
} from '../components/PortalElements'

const baseMenu = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '📊', heading: 'Tableau de bord', description: 'Vue générale de votre activité au sein de la clinique.' },
  { id: 'rendez-vous', label: 'Rendez-vous', icon: '📅', heading: 'Gestion des rendez-vous', description: 'Consultez et organisez les rendez-vous des patients.' },
  { id: 'patients', label: 'Patients', icon: '👥', heading: 'Gestion des patients', description: 'Créez des comptes et retrouvez les patients autorisés.' },
  { id: 'dossiers', label: 'Dossiers médicaux', icon: '📁', heading: 'Dossiers médicaux', description: 'Consultation en lecture seule selon votre profil.' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', heading: 'Notifications', description: 'Consultez vos notifications internes.' },
]

const emptyAppointment = {
  patient_id: '',
  medecin_id: '',
  creneau_id: '',
  motif: '',
}

const emptyPatient = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
}

function getList(response) {
  const data = response?.data
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getError(error) {
  const data = error?.response?.data
  if (data?.errors) {
    return Object.values(data.errors).flat().join(' ')
  }
  return data?.message || 'Une erreur est survenue. Veuillez réessayer.'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR')
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '—'
}

function patientName(patient) {
  const user = patient?.user || patient
  return `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'Patient'
}

function doctorName(medecin) {
  const user = medecin?.user || {}
  return `Dr ${user.prenom || ''} ${user.nom || ''}`.trim()
}

function statusLabel(status) {
  const labels = {
    EN_ATTENTE: 'En attente',
    CONFIRME: 'Confirmé',
    ANNULE: 'Annulé',
    TERMINE: 'Terminé',
  }
  return labels[status] || status || '—'
}

function statusColor(status) {
  const colors = {
    EN_ATTENTE: '#b7791f',
    CONFIRME: '#23845b',
    ANNULE: '#c0392b',
    TERMINE: '#526579',
  }
  return colors[status] || '#526579'
}

function AssistantDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [typeAssistant, setTypeAssistant] = useState('')
  const [medecins, setMedecins] = useState([])
  const [patients, setPatients] = useState([])
  const [rendezVous, setRendezVous] = useState([])
  const [notifications, setNotifications] = useState([])
  const [dossiers, setDossiers] = useState([])
  const [selectedDossier, setSelectedDossier] = useState(null)

  const [patientSearch, setPatientSearch] = useState('')
  const [rdvSearch, setRdvSearch] = useState('')
  const [rdvStatus, setRdvStatus] = useState('')

  const [patientForm, setPatientForm] = useState(emptyPatient)
  const [appointmentForm, setAppointmentForm] = useState(emptyAppointment)
  const [availableSlots, setAvailableSlots] = useState([])

  const [editingAppointment, setEditingAppointment] = useState(null)
  const [reprogramSlot, setReprogramSlot] = useState('')

  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isSpecialized = typeAssistant === 'SPECIALISE'

  const menu = useMemo(() => {
    if (typeAssistant === 'RECEPTION') {
      return baseMenu.filter((item) => item.id !== 'dossiers')
    }
    return baseMenu
  }, [typeAssistant])

  const selectedDoctor = useMemo(
    () => medecins.find((item) => String(item.id) === String(appointmentForm.medecin_id)),
    [medecins, appointmentForm.medecin_id]
  )

  const loadDashboard = async () => {
    const response = await api.get('/assistant/dashboard')
    setDashboard(response.data)
    setTypeAssistant(response.data?.type_assistant || '')
  }

  const loadMedecins = async () => {
    const response = await api.get('/assistant/medecins')
    setMedecins(getList(response))
  }

  const loadPatients = async (search = '') => {
    const response = await api.get('/assistant/patients', {
      params: search ? { search } : {},
    })
    setPatients(getList(response))
  }

  const loadRendezVous = async () => {
    const params = {}
    if (rdvSearch.trim()) params.search = rdvSearch.trim()
    if (rdvStatus) params.statut = rdvStatus

    const response = await api.get('/assistant/rendez-vous', { params })
    setRendezVous(getList(response))
  }

  const loadNotifications = async () => {
    const response = await api.get('/assistant/notifications')
    setNotifications(getList(response))
  }

  const loadDossiers = async () => {
    if (!isSpecialized) return
    const response = await api.get('/assistant/dossiers')
    setDossiers(getList(response))
  }

  const refreshDashboard = async () => {
    try {
      await loadDashboard()
    } catch (err) {
      setError(getError(err))
    }
  }

  useEffect(() => {
    const initialize = async () => {
      setLoading(true)
      setError('')

      try {
        const results = await Promise.all([
          loadDashboard(),
          loadMedecins(),
          loadPatients(),
          loadRendezVous(),
          loadNotifications(),
        ])

        // Les dossiers sont chargés après avoir identifié le type d'assistant.
        void results

        const dashboardResponse = await api.get('/assistant/dashboard')
        if (dashboardResponse.data?.type_assistant === 'SPECIALISE') {
          const dossierResponse = await api.get('/assistant/dossiers')
          setDossiers(getList(dossierResponse))
        }
      } catch (err) {
        setError(getError(err))
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [])

  const clearMessages = () => {
    setError('')
    setSuccess('')
    setTemporaryPassword('')
  }

  const handleSearchPatients = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await loadPatients(patientSearch.trim())
    } catch (err) {
      setError(getError(err))
    }
  }

  const handleSearchAppointments = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await loadRendezVous()
    } catch (err) {
      setError(getError(err))
    }
  }

  const handleCreatePatient = async (event) => {
    event.preventDefault()
    clearMessages()
    setSaving(true)

    try {
      const response = await api.post('/assistant/patients', patientForm)
      const createdPatient = response.data?.patient

      if (createdPatient) {
        setPatients((current) => [
          createdPatient,
          ...current.filter((item) => item.id !== createdPatient.id),
        ])
      }

      setTemporaryPassword(response.data?.temporary_password || '')
      setSuccess(response.data?.message || 'Compte patient créé avec succès.')
      setPatientForm(emptyPatient)
      await refreshDashboard()
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }

  const loadAvailableSlots = async (doctorId) => {
    if (!doctorId) {
      setAvailableSlots([])
      return
    }

    try {
      const response = await api.get('/assistant/creneaux-disponibles', {
        params: { medecin_id: doctorId },
      })
      setAvailableSlots(getList(response))
    } catch (err) {
      setAvailableSlots([])
      setError(getError(err))
    }
  }

  const handleDoctorChange = async (value) => {
    setAppointmentForm((current) => ({
      ...current,
      medecin_id: value,
      creneau_id: '',
    }))
    setAvailableSlots([])
    setError('')

    if (value) {
      await loadAvailableSlots(value)
    }
  }

  const handleCreateAppointment = async (event) => {
    event.preventDefault()
    clearMessages()

    if (!appointmentForm.patient_id) {
      setError('Veuillez choisir un patient.')
      return
    }

    if (!isSpecialized && !appointmentForm.medecin_id) {
      setError('Veuillez choisir un médecin.')
      return
    }

    if (!appointmentForm.creneau_id) {
      setError('Veuillez choisir un créneau disponible.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        patient_id: Number(appointmentForm.patient_id),
        creneau_id: Number(appointmentForm.creneau_id),
        motif: appointmentForm.motif,
      }

      if (!isSpecialized) {
        payload.medecin_id = Number(appointmentForm.medecin_id)
      }

      const response = await api.post('/assistant/rendez-vous', payload)

      setSuccess(response.data?.message || 'Rendez-vous créé avec succès.')
      setAppointmentForm(emptyAppointment)
      setAvailableSlots([])
      await Promise.all([
        loadRendezVous(),
        refreshDashboard(),
      ])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return

    clearMessages()
    setSaving(true)

    try {
      const response = await api.post(`/assistant/rendez-vous/${id}/annuler`)
      setSuccess(response.data?.message || 'Rendez-vous annulé.')
      await Promise.all([
        loadRendezVous(),
        refreshDashboard(),
      ])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }
  
  const handleConfirmAppointment = async (id) => {
    if (!window.confirm('Voulez-vous confirmer ce rendez-vous ?')) return

    clearMessages()
    setSaving(true)

    try {
      const response = await api.post(
        `/assistant/rendez-vous/${id}/confirmer`
      )

      setSuccess(response.data?.message || 'Rendez-vous confirmé.')

      await Promise.all([
        loadRendezVous(),
        refreshDashboard(),
      ])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }



  const startReprogramming = async (appointment) => {
    clearMessages()
    setEditingAppointment(appointment)
    setReprogramSlot('')
    await loadAvailableSlots(appointment.medecin_id)
  }

  const handleReprogramAppointment = async (event) => {
    event.preventDefault()
    if (!editingAppointment || !reprogramSlot) {
      setError('Veuillez choisir un nouveau créneau.')
      return
    }

    clearMessages()
    setSaving(true)

    try {
      const response = await api.post(
        `/assistant/rendez-vous/${editingAppointment.id}/reprogrammer`,
        { creneau_id: Number(reprogramSlot) }
      )

      setSuccess(response.data?.message || 'Rendez-vous reprogrammé.')
      setEditingAppointment(null)
      setReprogramSlot('')
      setAvailableSlots([])

      await Promise.all([
        loadRendezVous(),
        refreshDashboard(),
      ])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSaving(false)
    }
  }

  const handleOpenDossier = async (patientId) => {
    clearMessages()
    setLoading(true)

    try {
      const response = await api.get(`/assistant/dossiers/${patientId}`)
      setSelectedDossier(response.data)
    } catch (err) {
      setError(getError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleMarkNotification = async (id) => {
    try {
      await api.patch(`/assistant/notifications/${id}/lue`)
      await Promise.all([loadNotifications(), refreshDashboard()])
    } catch (err) {
      setError(getError(err))
    }
  }

  const handleMarkAllNotifications = async () => {
    try {
      await api.patch('/assistant/notifications/lues')
      setSuccess('Toutes les notifications sont marquées comme lues.')
      await Promise.all([loadNotifications(), refreshDashboard()])
    } catch (err) {
      setError(getError(err))
    }
  }

  const renderDashboard = () => (
    <>
      <div className="portal-stats-grid">
        <PortalStat
          icon="📅"
          label="Rendez-vous aujourd'hui"
          value={dashboard?.rendez_vous_aujourdhui ?? '—'}
        />
        <PortalStat
          icon="⏳"
          label="Rendez-vous en attente"
          value={dashboard?.rendez_vous_en_attente ?? '—'}
          tone="orange"
        />
        <PortalStat
          icon="👥"
          label="Patients enregistrés"
          value={dashboard?.total_patients ?? '—'}
          tone="purple"
        />
        <PortalStat
          icon="🔔"
          label="Notifications non lues"
          value={dashboard?.notifications_non_lues ?? '—'}
          tone="green"
        />
      </div>

      <PortalPanel
        title="Bienvenue dans votre espace"
        description="Les outils de gestion administrative de la clinique."
      >
        <div className="portal-welcome">
          <div className="portal-welcome-symbol">👩‍💼</div>
          <div>
            <h3>Accompagner les patients et organiser les rendez-vous</h3>
            <p>
              Vous pouvez créer des comptes patients, rechercher les patients
              autorisés et organiser leurs rendez-vous.
            </p>
            {isSpecialized && dashboard?.medecin?.user && (
              <p>
                <strong>Médecin associé : </strong>
                {doctorName(dashboard.medecin)}
              </p>
            )}
          </div>
        </div>
      </PortalPanel>

      <PortalPanel
        title="Derniers rendez-vous"
        description="Les cinq rendez-vous les plus récents."
      >
        {dashboard?.derniers_rendez_vous?.length ? (
          <div className="assistant-table-wrap">
            <table className="assistant-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Médecin</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.derniers_rendez_vous.map((rdv) => (
                  <tr key={rdv.id}>
                    <td>{patientName(rdv.patient)}</td>
                    <td>{doctorName(rdv.medecin)}</td>
                    <td>{formatDate(rdv.creneau?.date_creneau)}</td>
                    <td>{formatTime(rdv.creneau?.heure_debut)}</td>
                    <td>
                      <span style={{ color: statusColor(rdv.statut), fontWeight: 700 }}>
                        {statusLabel(rdv.statut)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="assistant-muted">Aucun rendez-vous pour le moment.</p>
        )}
      </PortalPanel>

      <PortalNotice>
        Les dossiers médicaux sont accessibles uniquement à l'assistant
        spécialisé, en lecture seule et dans le périmètre du médecin associé.
      </PortalNotice>
    </>
  )

  const renderPatients = () => (
    <>
      <PortalPanel
        title="Créer un compte patient"
        description="Les informations de connexion temporaires seront affichées après la création."
      >
        <form onSubmit={handleCreatePatient} className="assistant-form">
          <div className="assistant-form-grid">
            <label>
              Nom *
              <input
                value={patientForm.nom}
                onChange={(e) => setPatientForm({ ...patientForm, nom: e.target.value })}
                required
                maxLength={100}
              />
            </label>

            <label>
              Prénom *
              <input
                value={patientForm.prenom}
                onChange={(e) => setPatientForm({ ...patientForm, prenom: e.target.value })}
                required
                maxLength={100}
              />
            </label>

            <label>
              Adresse e-mail *
              <input
                type="email"
                value={patientForm.email}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
                required
              />
            </label>

            <label>
              Téléphone
              <input
                value={patientForm.telephone}
                onChange={(e) => setPatientForm({ ...patientForm, telephone: e.target.value })}
                maxLength={30}
              />
            </label>
          </div>

          <button className="assistant-button" type="submit" disabled={saving}>
            {saving ? 'Création...' : 'Créer le compte patient'}
          </button>
        </form>

        {temporaryPassword && (
          <div className="assistant-password">
            <strong>Compte créé. Mot de passe temporaire :</strong>
            <div className="assistant-password-value">{temporaryPassword}</div>
            <p>Communiquez ce mot de passe au patient de manière sécurisée.</p>
          </div>
        )}
      </PortalPanel>

      <PortalPanel
        title="Liste des patients"
        description="Rechercher un patient par nom, prénom, e-mail ou téléphone."
      >
        <form onSubmit={handleSearchPatients} className="assistant-search">
          <input
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            placeholder="Nom, prénom, e-mail ou téléphone..."
          />
          <button className="assistant-button" type="submit">Rechercher</button>
          <button
            className="assistant-button secondary"
            type="button"
            onClick={() => {
              setPatientSearch('')
              loadPatients('')
            }}
          >
            Réinitialiser
          </button>
        </form>

        {patients.length ? (
          <div className="assistant-table-wrap">
            <table className="assistant-table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>E-mail</th>
                  <th>Téléphone</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>{patientName(patient)}</td>
                    <td>{patient.user?.email || '—'}</td>
                    <td>{patient.user?.telephone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="assistant-muted">Aucun patient trouvé.</p>
        )}
      </PortalPanel>
    </>
  )

  const renderAppointmentForm = () => (
    <PortalPanel
      title="Nouveau rendez-vous"
      description="Le rendez-vous sera créé avec le statut En attente."
    >
      <form onSubmit={handleCreateAppointment} className="assistant-form">
        <div className="assistant-form-grid">
          <label>
            Patient *
            <select
              value={appointmentForm.patient_id}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: e.target.value })}
              required
            >
              <option value="">Choisir un patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientName(patient)}
                </option>
              ))}
            </select>
          </label>

          {!isSpecialized && (
            <label>
              Médecin *
              <select
                value={appointmentForm.medecin_id}
                onChange={(e) => handleDoctorChange(e.target.value)}
                required
              >
                <option value="">Choisir un médecin</option>
                {medecins.map((medecin) => (
                  <option key={medecin.id} value={medecin.id}>
                    {doctorName(medecin)}
                    {medecin.specialite ? ` — ${medecin.specialite}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isSpecialized && (
            <label>
              Médecin associé
              <input
                value={doctorName(medecins[0])}
                readOnly
              />
            </label>
          )}

          <label>
            Créneau disponible *
            <select
              value={appointmentForm.creneau_id}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, creneau_id: e.target.value })}
              required
              disabled={!isSpecialized && !appointmentForm.medecin_id}
            >
              <option value="">Choisir un créneau</option>
              {availableSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatDate(slot.date_creneau)} — {formatTime(slot.heure_debut)} à {formatTime(slot.heure_fin)}
                </option>
              ))}
            </select>
          </label>

          <label className="assistant-full-width">
            Motif du rendez-vous
            <textarea
              rows="3"
              value={appointmentForm.motif}
              onChange={(e) => setAppointmentForm({ ...appointmentForm, motif: e.target.value })}
              placeholder="Motif facultatif..."
            />
          </label>
        </div>

        {availableSlots.length === 0 && (isSpecialized || appointmentForm.medecin_id) && (
          <p className="assistant-muted">Aucun créneau disponible pour le moment.</p>
        )}

        <button className="assistant-button" type="submit" disabled={saving}>
          {saving ? 'Enregistrement...' : 'Créer le rendez-vous'}
        </button>
      </form>
    </PortalPanel>
  )

  const renderAppointments = () => (
    <>
      {renderAppointmentForm()}

      <PortalPanel
        title="Liste des rendez-vous"
        description="Rechercher et filtrer les rendez-vous selon leur statut."
      >
        <form onSubmit={handleSearchAppointments} className="assistant-search">
          <input
            value={rdvSearch}
            onChange={(e) => setRdvSearch(e.target.value)}
            placeholder="Rechercher par patient..."
          />

          <select
            value={rdvStatus}
            onChange={(e) => setRdvStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="CONFIRME">Confirmé</option>
            <option value="ANNULE">Annulé</option>
            <option value="TERMINE">Terminé</option>
          </select>

          <button className="assistant-button" type="submit">Filtrer</button>
        </form>

        {rendezVous.length ? (
          <div className="assistant-table-wrap">
            <table className="assistant-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Médecin</th>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rendezVous.map((rdv) => (
                  <tr key={rdv.id}>
                    <td>{patientName(rdv.patient)}</td>
                    <td>{doctorName(rdv.medecin)}</td>
                    <td>{formatDate(rdv.creneau?.date_creneau)}</td>
                    <td>{formatTime(rdv.creneau?.heure_debut)}</td>
                    <td>
                      <span style={{ color: statusColor(rdv.statut), fontWeight: 700 }}>
                        {statusLabel(rdv.statut)}
                      </span>
                    </td>
                    <td>
                      {['EN_ATTENTE', 'CONFIRME'].includes(rdv.statut) && (
                        <div className="assistant-actions">

                          {isSpecialized && rdv.statut === 'EN_ATTENTE' && (
                            <button
                              type="button"
                              className="assistant-button secondary small"
                              onClick={() => handleConfirmAppointment(rdv.id)}
                              disabled={saving}
                            >
                              Confirmer
                            </button>
                          )}

                          <button
                            type="button"
                            className="assistant-button secondary small"
                            onClick={() => startReprogramming(rdv)}
                            disabled={saving}
                          >
                            Reprogrammer
                          </button>
                          <button
                            type="button"
                            className="assistant-button danger small"
                            onClick={() => handleCancelAppointment(rdv.id)}
                            disabled={saving}
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="assistant-muted">Aucun rendez-vous trouvé.</p>
        )}
      </PortalPanel>

      {editingAppointment && (
        <PortalPanel
          title="Reprogrammer le rendez-vous"
          description={`Patient : ${patientName(editingAppointment.patient)}`}
        >
          <form onSubmit={handleReprogramAppointment} className="assistant-form">
            <label>
              Nouveau créneau *
              <select
                value={reprogramSlot}
                onChange={(e) => setReprogramSlot(e.target.value)}
                required
              >
                <option value="">Choisir un créneau</option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatDate(slot.date_creneau)} — {formatTime(slot.heure_debut)} à {formatTime(slot.heure_fin)}
                  </option>
                ))}
              </select>
            </label>

            <div className="assistant-actions">
              <button className="assistant-button" type="submit" disabled={saving}>
                Confirmer la reprogrammation
              </button>
              <button
                className="assistant-button secondary"
                type="button"
                onClick={() => {
                  setEditingAppointment(null)
                  setAvailableSlots([])
                }}
              >
                Fermer
              </button>
            </div>
          </form>
        </PortalPanel>
      )}
    </>
  )

  const renderDossiers = () => (
    <>
      {!isSpecialized ? (
        <PortalNotice>
          Cette rubrique est réservée aux assistants spécialisés.
        </PortalNotice>
      ) : (
        <>
          <PortalPanel
            title="Dossiers médicaux"
            description="Consultation en lecture seule des dossiers des patients du médecin associé."
          >
            {dossiers.length ? (
              <div className="assistant-table-wrap">
                <table className="assistant-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>E-mail</th>
                      <th>Téléphone</th>
                      <th>Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiers.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patientName(patient)}</td>
                        <td>{patient.user?.email || '—'}</td>
                        <td>{patient.user?.telephone || '—'}</td>
                        <td>
                          <button
                            className="assistant-button secondary small"
                            type="button"
                            onClick={() => handleOpenDossier(patient.id)}
                          >
                            Consulter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="assistant-muted">Aucun dossier accessible.</p>
            )}
          </PortalPanel>

          {selectedDossier && (
            <PortalPanel
              title={`Dossier médical — ${patientName(selectedDossier)}`}
              description="Informations en lecture seule."
            >
              <div className="assistant-dossier-info">
                <p><strong>E-mail :</strong> {selectedDossier.user?.email || '—'}</p>
                <p><strong>Téléphone :</strong> {selectedDossier.user?.telephone || '—'}</p>
                <p>
                  <strong>Date de création du dossier :</strong>{' '}
                  {formatDate(selectedDossier.dossier_medical?.date_creation)}
                </p>
              </div>

              <h3 className="assistant-subtitle">Consultations</h3>

              {selectedDossier.dossier_medical?.consultations?.length ? (
                selectedDossier.dossier_medical.consultations.map((consultation) => (
                  <div className="assistant-consultation" key={consultation.id}>
                    <p>
                      <strong>Date :</strong>{' '}
                      {consultation.date_consultation
                        ? new Date(consultation.date_consultation).toLocaleString('fr-FR')
                        : '—'}
                    </p>
                    <p><strong>Diagnostic :</strong> {consultation.diagnostic || '—'}</p>
                    <p><strong>Notes :</strong> {consultation.notes || '—'}</p>

                    {consultation.ordonnances?.length > 0 && (
                      <>
                        <h4>Ordonnances</h4>
                        {consultation.ordonnances.map((ordonnance) => (
                          <div key={ordonnance.id} className="assistant-ordonnance">
                            <p><strong>Date :</strong> {formatDate(ordonnance.date_creation)}</p>
                            <p><strong>Instructions :</strong> {ordonnance.instructions || '—'}</p>

                            {ordonnance.lignes?.length > 0 && (
                              <ul>
                                {ordonnance.lignes.map((ligne) => (
                                  <li key={ligne.id}>
                                    {ligne.nom_medicament} — {ligne.dosage || 'Dosage non précisé'}
                                    {ligne.frequence ? ` — ${ligne.frequence}` : ''}
                                    {ligne.duree ? ` — ${ligne.duree}` : ''}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p className="assistant-muted">Aucune consultation enregistrée.</p>
              )}

              <button
                type="button"
                className="assistant-button secondary"
                onClick={() => setSelectedDossier(null)}
              >
                Fermer le dossier
              </button>
            </PortalPanel>
          )}
        </>
      )}
    </>
  )

  const renderNotifications = () => (
    <PortalPanel
      title="Notifications internes"
      description="Les notifications qui vous sont destinées."
    >
      <div className="assistant-notification-toolbar">
        <span>{notifications.filter((item) => !item.lu).length} non lue(s)</span>
        <button
          type="button"
          className="assistant-button secondary"
          onClick={handleMarkAllNotifications}
          disabled={!notifications.some((item) => !item.lu)}
        >
          Tout marquer comme lu
        </button>
      </div>

      {notifications.length ? (
        <div className="assistant-notifications">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`assistant-notification ${notification.lu ? 'read' : 'unread'}`}
            >
              <div>
                <strong>{notification.titre}</strong>
                <p>{notification.message}</p>
                <small>
                  {notification.created_at
                    ? new Date(notification.created_at).toLocaleString('fr-FR')
                    : '—'}
                </small>
              </div>

              {!notification.lu && (
                <button
                  type="button"
                  className="assistant-button secondary small"
                  onClick={() => handleMarkNotification(notification.id)}
                >
                  Marquer comme lue
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="assistant-muted">Aucune notification pour le moment.</p>
      )}
    </PortalPanel>
  )

  const renderSection = (section) => {
    if (section === 'dashboard') return renderDashboard()
    if (section === 'patients') return renderPatients()
    if (section === 'rendez-vous') return renderAppointments()
    if (section === 'dossiers') return renderDossiers()
    if (section === 'notifications') return renderNotifications()
    return null
  }

  return (
    <PortalLayout
      roleLabel="Espace assistant"
      title="Espace assistant"
      subtitle="Bienvenue dans votre espace professionnel."
      profileLabel={
        typeAssistant =='SPECIALISE' ? 'Assistant spécialisé' : typeAssistant === 'RECEPTION' ? 'Assistant Génerale':''
      }
      menu={menu}
    >
      {(section) => (
        <>
          {error && (
            <div className="assistant-alert error">
              {error}
              <button type="button" onClick={() => setError('')}>×</button>
            </div>
          )}

          {success && (
            <div className="assistant-alert success">
              {success}
              <button type="button" onClick={() => setSuccess('')}>×</button>
            </div>
          )}

          {loading ? (
            <PortalPanel>
              <p className="assistant-muted">Chargement des données...</p>
            </PortalPanel>
          ) : (
            renderSection(section)
          )}
        </>
      )}
    </PortalLayout>
  )
}

export default AssistantDashboard

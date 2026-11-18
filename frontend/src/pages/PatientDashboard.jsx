import { useCallback, useEffect, useState } from 'react'
import PortalLayout from '../components/PortalLayout'
import api from '../api/api'
import './Patient.css'

const menu = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '⌂', heading: 'Tableau de bord', description: 'Retrouvez les informations essentielles de votre espace patient.' },
  { id: 'prendre-rdv', label: 'Prendre rendez-vous', icon: '+', heading: 'Prendre un rendez-vous', description: 'Recherchez un médecin et choisissez un créneau disponible.' },
  { id: 'rendez-vous', label: 'Mes rendez-vous', icon: '▣', heading: 'Mes rendez-vous', description: 'Consultez, modifiez ou annulez vos rendez-vous.' },
  { id: 'dossier', label: 'Mon dossier médical', icon: '▤', heading: 'Mon dossier médical', description: 'Consultez les informations de votre dossier médical.' },
  { id: 'ordonnances', label: 'Mes ordonnances', icon: '▧', heading: 'Mes ordonnances', description: 'Retrouvez les prescriptions établies par vos médecins.' },
  { id: 'notifications', label: 'Notifications', icon: '♢', heading: 'Mes notifications', description: 'Suivez les rappels et les informations de la clinique.' },
]

const statusLabels = {
  EN_ATTENTE: 'En attente',
  CONFIRME: 'Confirmé',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé',
}

const statusClasses = {
  EN_ATTENTE: 'pending',
  CONFIRME: 'confirmed',
  ANNULE: 'cancelled',
  TERMINE: 'completed',
}

function getList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTime(slot) {
  if (!slot) return 'Date non définie'
  return `${formatDate(slot.date_creneau)} à ${String(slot.heure_debut || '').slice(0, 5)}`
}

function doctorName(medecin) {
  const user = medecin?.user
  if (!user) return 'Médecin'
  return `Dr ${user.prenom || ''} ${user.nom || ''}`.trim()
}

function getError(error) {
  return error?.response?.data?.message
    || Object.values(error?.response?.data?.errors || {}).flat()[0]
    || 'Une erreur est survenue. Veuillez réessayer.'
}

function isMoreThan24Hours(slot) {
  if (!slot?.date_creneau || !slot?.heure_debut) return false

  const date = String(slot.date_creneau).slice(0, 10)
  const time = String(slot.heure_debut)

  const appointment = new Date(`${date}T${time}`)

  if (Number.isNaN(appointment.getTime())) return false

  return appointment.getTime() - Date.now() >= 24 * 60 * 60 * 1000
}

function PatientDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [medecins, setMedecins] = useState([])
  const [rendezVous, setRendezVous] = useState([])
  const [dossier, setDossier] = useState(null)
  const [ordonnances, setOrdonnances] = useState([])
  const [notifications, setNotifications] = useState([])

  const [selectedMedecin, setSelectedMedecin] = useState('')
  const [creneaux, setCreneaux] = useState([])
  const [selectedCreneau, setSelectedCreneau] = useState('')
  const [motif, setMotif] = useState('')
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleSlot, setRescheduleSlot] = useState('')

  const [loading, setLoading] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [specialite, setSpecialite] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadDashboard = useCallback(async () => {
    const response = await api.get('/patient/dashboard')
    setDashboard(response.data)
  }, [])

  const loadMedecins = useCallback(async () => {
    const response = await api.get('/patient/medecins')
    setMedecins(getList(response.data))
  }, [])

  const loadRendezVous = useCallback(async () => {
    const response = await api.get('/patient/rendez-vous')
    setRendezVous(getList(response.data))
  }, [])

  const loadDossier = useCallback(async () => {
    const response = await api.get('/patient/dossier')
    setDossier(response.data?.dossier || null)
  }, [])

  const loadOrdonnances = useCallback(async () => {
    const response = await api.get('/patient/ordonnances')
    setOrdonnances(getList(response.data))
  }, [])

  const loadNotifications = useCallback(async () => {
    const response = await api.get('/patient/notifications')
    setNotifications(getList(response.data))
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.allSettled([
      loadDashboard(),
      loadMedecins(),
      loadRendezVous(),
      loadDossier(),
      loadOrdonnances(),
      loadNotifications(),
    ])

    const failed = results.find((result) => result.status === 'rejected')
    if (failed) setError(getError(failed.reason))

    setLoading(false)
  }, [
    loadDashboard,
    loadMedecins,
    loadRendezVous,
    loadDossier,
    loadOrdonnances,
    loadNotifications,
  ])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const loadSlots = async (medecinId) => {
    if (!medecinId) {
      setCreneaux([])
      return
    }

    setLoadingSlots(true)
    setError('')
    setSelectedCreneau('')
    setRescheduleSlot('')

    try {
      const response = await api.get('/patient/creneaux-disponibles', {
        params: { medecin_id: medecinId },
      })
      setCreneaux(getList(response.data))
    } catch (err) {
      setError(getError(err))
      setCreneaux([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleMedecinChange = (value) => {
    setSelectedMedecin(value)
    loadSlots(value)
  }

  const handleBooking = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedMedecin || !selectedCreneau) {
      setError('Veuillez choisir un médecin et un créneau.')
      return
    }

    setSubmitting(true)

    try {
      const response = await api.post('/patient/rendez-vous', {
        medecin_id: Number(selectedMedecin),
        creneau_id: Number(selectedCreneau),
        motif: motif.trim() || null,
      })

      setSuccess(response.data?.message || 'Votre demande a été envoyée.')
      setMotif('')
      setSelectedCreneau('')
      await Promise.all([loadDashboard(), loadRendezVous(), loadSlots(selectedMedecin)])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async (rdv) => {
    if (!window.confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return

    setError('')
    setSuccess('')

    try {
      const response = await api.post(`/patient/rendez-vous/${rdv.id}/annuler`)
      setSuccess(response.data?.message || 'Rendez-vous annulé.')
      await Promise.all([loadDashboard(), loadRendezVous(), loadMedecins()])
    } catch (err) {
      setError(getError(err))
    }
  }

  const startReschedule = async (rdv) => {
    setError('')
    setSuccess('')
    setRescheduleId(rdv.id)
    setRescheduleSlot('')
    await loadSlots(rdv.medecin_id)
  }

  const handleReschedule = async (rdv) => {
    if (!rescheduleSlot) {
      setError('Veuillez choisir un nouveau créneau.')
      return
    }

    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const response = await api.post(
        `/patient/rendez-vous/${rdv.id}/reprogrammer`,
        { creneau_id: Number(rescheduleSlot) }
      )

      setSuccess(response.data?.message || 'Rendez-vous reprogrammé.')
      setRescheduleId(null)
      setRescheduleSlot('')
      await Promise.all([loadDashboard(), loadRendezVous(), loadSlots(selectedMedecin)])
    } catch (err) {
      setError(getError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const markNotificationRead = async (notification) => {
    if (notification.lu) return

    try {
      await api.patch(`/patient/notifications/${notification.id}/lue`)
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, lu: true } : item
        )
      )
      await loadDashboard()
    } catch (err) {
      setError(getError(err))
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/patient/notifications/lues')
      setNotifications((current) => current.map((item) => ({ ...item, lu: true })))
      await loadDashboard()
      setSuccess('Toutes les notifications sont marquées comme lues.')
    } catch (err) {
      setError(getError(err))
    }
  }

  const filteredMedecins = medecins.filter((medecin) => {
    const name = `${medecin.user?.prenom || ''} ${medecin.user?.nom || ''}`.toLowerCase()
    const matchesSearch = !search
      || name.includes(search.toLowerCase())
      || String(medecin.specialite || '').toLowerCase().includes(search.toLowerCase())

    const matchesSpecialite = !specialite || medecin.specialite === specialite
    return matchesSearch && matchesSpecialite
  })

  const specialites = [...new Set(
    medecins.map((medecin) => medecin.specialite).filter(Boolean)
  )]

  const filteredRendezVous = rendezVous.filter((rdv) =>
    !statusFilter || rdv.statut === statusFilter
  )

  const renderDashboard = () => (
    <div className="patient-section">
      <div className="patient-stats">
        <div className="patient-stat-card">
          <span className="patient-stat-icon">▣</span>
          <div>
            <span className="patient-stat-label">Rendez-vous à venir</span>
            <strong>{dashboard?.rendez_vous_a_venir ?? '—'}</strong>
          </div>
        </div>
        <div className="patient-stat-card">
          <span className="patient-stat-icon purple">◷</span>
          <div>
            <span className="patient-stat-label">En attente</span>
            <strong>{dashboard?.rendez_vous_en_attente ?? '—'}</strong>
          </div>
        </div>
        <div className="patient-stat-card">
          <span className="patient-stat-icon green">▤</span>
          <div>
            <span className="patient-stat-label">Mes ordonnances</span>
            <strong>{dashboard?.ordonnances ?? '—'}</strong>
          </div>
        </div>
        <div className="patient-stat-card">
          <span className="patient-stat-icon orange">♢</span>
          <div>
            <span className="patient-stat-label">Notifications non lues</span>
            <strong>{dashboard?.notifications_non_lues ?? '—'}</strong>
          </div>
        </div>
      </div>

      <section className="patient-card">
        <div className="patient-card-heading">
          <div>
            <h3>Bienvenue dans votre espace santé</h3>
            <p>Gérez vos rendez-vous et consultez vos informations médicales.</p>
          </div>
          <span className="patient-welcome-icon">✚</span>
        </div>
        <div className="patient-info-note">
          La modification ou l'annulation d'un rendez-vous est possible au moins
          24 heures avant l'heure prévue du rendez-vous.
        </div>
      </section>

      <section className="patient-card">
        <div className="patient-card-heading">
          <div>
            <h3>Mes prochains rendez-vous</h3>
            <p>Les rendez-vous à venir dans votre agenda.</p>
          </div>
        </div>

        {getList(dashboard?.prochains_rendez_vous).length === 0 ? (
          <div className="patient-empty">Aucun rendez-vous à venir.</div>
        ) : (
          <div className="patient-list">
            {dashboard.prochains_rendez_vous.map((rdv) => (
              <div className="patient-list-row" key={rdv.id}>
                <div>
                  <strong>{doctorName(rdv.medecin)}</strong>
                  <span>{formatDateTime(rdv.creneau)}</span>
                </div>
                <span className={`patient-status ${statusClasses[rdv.statut] || ''}`}>
                  {statusLabels[rdv.statut] || rdv.statut}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  const renderBooking = () => (
    <div className="patient-section">
      <section className="patient-card">
        <div className="patient-card-heading">
          <div>
            <h3>Réserver une consultation</h3>
            <p>Choisissez un médecin, puis un créneau disponible.</p>
          </div>
        </div>

        <div className="patient-form-grid">
          <label className="patient-field patient-field-full">
            <span>Rechercher un médecin ou une spécialité</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom du médecin ou spécialité..."
            />
          </label>

          <label className="patient-field">
            <span>Spécialité</span>
            <select value={specialite} onChange={(event) => setSpecialite(event.target.value)}>
              <option value="">Toutes les spécialités</option>
              {specialites.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="patient-empty">Chargement des médecins...</div>
        ) : filteredMedecins.length === 0 ? (
          <div className="patient-empty">Aucun médecin trouvé.</div>
        ) : (
          <div className="patient-doctor-grid">
            {filteredMedecins.map((medecin) => (
              <button
                type="button"
                key={medecin.id}
                className={`patient-doctor-card ${String(selectedMedecin) === String(medecin.id) ? 'selected' : ''}`}
                onClick={() => handleMedecinChange(String(medecin.id))}
              >
                <span className="patient-doctor-avatar">Dr</span>
                <span className="patient-doctor-details">
                  <strong>{doctorName(medecin)}</strong>
                  <small>{medecin.specialite || 'Spécialité non renseignée'}</small>
                </span>
                <span className="patient-doctor-check">
                  {String(selectedMedecin) === String(medecin.id) ? '✓' : '+'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedMedecin && (
        <section className="patient-card">
          <div className="patient-card-heading">
            <div>
              <h3>Créneaux disponibles</h3>
              <p>Sélectionnez la date et l'heure qui vous conviennent.</p>
            </div>
          </div>

          {loadingSlots ? (
            <div className="patient-empty">Chargement des créneaux...</div>
          ) : creneaux.length === 0 ? (
            <div className="patient-empty">Aucun créneau disponible pour ce médecin.</div>
          ) : (
            <div className="patient-slot-grid">
              {creneaux.map((slot) => (
                <button
                  type="button"
                  key={slot.id}
                  className={`patient-slot ${String(selectedCreneau) === String(slot.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedCreneau(String(slot.id))}
                >
                  <strong>{formatDate(slot.date_creneau)}</strong>
                  <span>{String(slot.heure_debut).slice(0, 5)} – {String(slot.heure_fin).slice(0, 5)}</span>
                </button>
              ))}
            </div>
          )}

          <form className="patient-booking-form" onSubmit={handleBooking}>
            <label className="patient-field">
              <span>Motif de consultation (facultatif)</span>
              <textarea
                rows="3"
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                placeholder="Décrivez brièvement le motif de votre consultation..."
              />
            </label>
            <button
              type="submit"
              className="patient-primary-button"
              disabled={!selectedCreneau || submitting}
            >
              {submitting ? 'Enregistrement...' : 'Confirmer ma demande'}
            </button>
          </form>
        </section>
      )}
    </div>
  )

  const renderAppointments = () => (
    <div className="patient-section">
      <section className="patient-card">
        <div className="patient-card-heading patient-heading-wrap">
          <div>
            <h3>Historique de mes rendez-vous</h3>
            <p>Consultez le statut et les détails de vos rendez-vous.</p>
          </div>
          <select
            className="patient-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="patient-empty">Chargement des rendez-vous...</div>
        ) : filteredRendezVous.length === 0 ? (
          <div className="patient-empty">Aucun rendez-vous trouvé.</div>
        ) : (
          <div className="patient-appointment-list">
            {filteredRendezVous.map((rdv) => {
              const canModify = ['EN_ATTENTE', 'CONFIRME'].includes(rdv.statut)
                && !rdv.consultation
                && isMoreThan24Hours(rdv.creneau)

              return (
                <article className="patient-appointment" key={rdv.id}>
                  <div className="patient-appointment-main">
                    <div className="patient-appointment-date">
                      <strong>{rdv.creneau?.date_creneau ? new Date(`${rdv.creneau.date_creneau}T00:00:00`).getDate() : '—'}</strong>
                      <span>{rdv.creneau?.date_creneau ? new Date(`${rdv.creneau.date_creneau}T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' }) : ''}</span>
                    </div>
                    <div className="patient-appointment-info">
                      <strong>{doctorName(rdv.medecin)}</strong>
                      <span>{formatDateTime(rdv.creneau)}</span>
                      {rdv.motif && <small>Motif : {rdv.motif}</small>}
                    </div>
                    <span className={`patient-status ${statusClasses[rdv.statut] || ''}`}>
                      {statusLabels[rdv.statut] || rdv.statut}
                    </span>
                  </div>

                  {canModify ? (
                    <div className="patient-appointment-actions">
                      <button
                        type="button"
                        className="patient-secondary-button"
                        onClick={() => startReschedule(rdv)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="patient-danger-button"
                        onClick={() => handleCancel(rdv)}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    ['EN_ATTENTE', 'CONFIRME'].includes(rdv.statut) && (
                      <p className="patient-locked-note">
                        Modification et annulation indisponibles : le délai minimum de 24 heures
                        est dépassé ou une consultation existe déjà.
                      </p>
                    )
                  )}

                  {rescheduleId === rdv.id && (
                    <div className="patient-reschedule-box">
                      <label className="patient-field">
                        <span>Nouveau créneau</span>
                        <select
                          value={rescheduleSlot}
                          onChange={(event) => setRescheduleSlot(event.target.value)}
                        >
                          <option value="">Choisir un créneau</option>
                          {creneaux
                            .filter((slot) => slot.id !== rdv.creneau_id)
                            .map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {formatDateTime(slot)}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="patient-appointment-actions">
                        <button
                          type="button"
                          className="patient-primary-button"
                          disabled={!rescheduleSlot || submitting}
                          onClick={() => handleReschedule(rdv)}
                        >
                          {submitting ? 'Enregistrement...' : 'Confirmer le changement'}
                        </button>
                        <button
                          type="button"
                          className="patient-secondary-button"
                          onClick={() => setRescheduleId(null)}
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )

  const renderDossier = () => (
    <div className="patient-section">
      <section className="patient-card">
        <div className="patient-card-heading">
          <div>
            <h3>Mon dossier médical</h3>
            <p>Consultez les consultations enregistrées par vos médecins.</p>
          </div>
        </div>

        {!dossier ? (
          <div className="patient-empty">
            Aucun dossier médical n'a encore été créé pour votre compte.
          </div>
        ) : dossier.consultations?.length ? (
          <div className="patient-medical-list">
            {dossier.consultations.map((consultation) => (
              <article className="patient-medical-card" key={consultation.id}>
                <div className="patient-medical-heading">
                  <div>
                    <strong>{doctorName(consultation.medecin)}</strong>
                    <span>{formatDate(String(consultation.date_consultation || '').slice(0, 10))}</span>
                  </div>
                  <span className="patient-medical-tag">Consultation</span>
                </div>
                <div className="patient-medical-content">
                  <h4>Diagnostic</h4>
                  <p>{consultation.diagnostic || 'Non renseigné'}</p>
                  {consultation.notes && (
                    <>
                      <h4>Notes médicales</h4>
                      <p>{consultation.notes}</p>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="patient-empty">
            Votre dossier existe, mais aucune consultation n'est encore enregistrée.
          </div>
        )}
      </section>
    </div>
  )

  const renderPrescriptions = () => (
    <div className="patient-section">
      <section className="patient-card">
        <div className="patient-card-heading">
          <div>
            <h3>Mes ordonnances</h3>
            <p>Consultez les prescriptions établies par vos médecins.</p>
          </div>
        </div>

        {loading ? (
          <div className="patient-empty">Chargement des ordonnances...</div>
        ) : ordonnances.length === 0 ? (
          <div className="patient-empty">Aucune ordonnance disponible.</div>
        ) : (
          <div className="patient-medical-list">
            {ordonnances.map((ordonnance) => (
              <article className="patient-medical-card" key={ordonnance.id}>
                <div className="patient-medical-heading">
                  <div>
                    <strong>{doctorName(ordonnance.consultation?.medecin)}</strong>
                    <span>Ordonnance du {formatDate(ordonnance.date_creation)}</span>
                  </div>
                  <span className="patient-medical-tag">Prescription</span>
                </div>

                {ordonnance.instructions && (
                  <p className="patient-prescription-instructions">
                    {ordonnance.instructions}
                  </p>
                )}

                <div className="patient-table-wrap">
                  <table className="patient-table">
                    <thead>
                      <tr>
                        <th>Médicament</th>
                        <th>Dosage</th>
                        <th>Fréquence</th>
                        <th>Durée</th>
                        <th>Quantité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(ordonnance.lignes || []).map((ligne) => (
                        <tr key={ligne.id}>
                          <td>{ligne.nom_medicament}</td>
                          <td>{ligne.dosage}</td>
                          <td>{ligne.frequence}</td>
                          <td>{ligne.duree}</td>
                          <td>{ligne.quantite || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  const renderNotifications = () => (
    <div className="patient-section">
      <section className="patient-card">
        <div className="patient-card-heading patient-heading-wrap">
          <div>
            <h3>Mes notifications</h3>
            <p>Rappels et informations concernant vos rendez-vous.</p>
          </div>
          {notifications.some((item) => !item.lu) && (
            <button
              type="button"
              className="patient-secondary-button"
              onClick={markAllNotificationsRead}
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {loading ? (
          <div className="patient-empty">Chargement des notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="patient-empty">Aucune notification pour le moment.</div>
        ) : (
          <div className="patient-notification-list">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`patient-notification ${notification.lu ? 'read' : 'unread'}`}
                onClick={() => markNotificationRead(notification)}
              >
                <span className="patient-notification-icon">♢</span>
                <span className="patient-notification-content">
                  <strong>{notification.titre}</strong>
                  <span>{notification.message}</span>
                  <small>
                    {notification.created_at
                      ? new Date(notification.created_at).toLocaleString('fr-FR')
                      : ''}
                  </small>
                </span>
                {!notification.lu && <span className="patient-unread-dot" />}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <PortalLayout
      roleLabel="Espace patient"
      title="Espace patient"
      subtitle="Bienvenue dans votre espace santé."
      menu={menu}
    >
      {(section) => (
        <div className="patient-page">
          {(error || success) && (
            <div className={`patient-alert ${error ? 'error' : 'success'}`}>
              <span>{error || success}</span>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setSuccess('')
                }}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          )}

          {section === 'dashboard' && renderDashboard()}
          {section === 'prendre-rdv' && renderBooking()}
          {section === 'rendez-vous' && renderAppointments()}
          {section === 'dossier' && renderDossier()}
          {section === 'ordonnances' && renderPrescriptions()}
          {section === 'notifications' && renderNotifications()}

          <div className="patient-refresh-row">
            <button
              type="button"
              className="patient-refresh-button"
              onClick={refreshAll}
              disabled={loading}
            >
              {loading ? 'Chargement...' : '↻ Actualiser les données'}
            </button>
          </div>
        </div>
      )}
    </PortalLayout>
  )
}

export default PatientDashboard

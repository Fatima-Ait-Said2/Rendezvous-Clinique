import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import api from '../api/api'

const emptyDoctor = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    specialite: '',
    description: '',
}

const emptyAssistant = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    type_assistant: 'RECEPTION',
    medecin_id: '',
}

function AdminDashboard() {
    const { user, logout } = useAuth()

    const [section, setSection] = useState('medecins')
    const [medecins, setMedecins] = useState([])
    const [assistants, setAssistants] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [search, setSearch] = useState('')

    const [formType, setFormType] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [doctorForm, setDoctorForm] = useState(emptyDoctor)
    const [assistantForm, setAssistantForm] = useState(emptyAssistant)
    const [temporaryPassword, setTemporaryPassword] = useState('')

    const loadData = async () => {
        setLoading(true)
        setError('')

        try {
            const [doctorsResponse, assistantsResponse] = await Promise.all([
                api.get('/admin/medecins'),
                api.get('/admin/assistants'),
            ])

        setMedecins(doctorsResponse.data.data || [])
        setAssistants(assistantsResponse.data.data || [])
        } catch (err) {
        setError(
            err.response?.data?.message ||
            'Impossible de charger les données.'
        )
        } finally {
        setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const filteredDoctors = useMemo(() => {
        const value = search.toLowerCase()

        return medecins.filter((doctor) =>
        `${doctor.nom} ${doctor.prenom} ${doctor.email} ${doctor.medecin?.specialite || ''}`
            .toLowerCase()
            .includes(value)
        )
    }, [medecins, search])

    const filteredAssistants = useMemo(() => {
        const value = search.toLowerCase()

        return assistants.filter((assistant) =>
        `${assistant.nom} ${assistant.prenom} ${assistant.email} ${assistant.assistant?.type_assistant || ''}`
            .toLowerCase()
            .includes(value)
        )
    }, [assistants, search])

    const closeForm = () => {
        setFormType(null)
        setEditingId(null)
        setDoctorForm(emptyDoctor)
        setAssistantForm(emptyAssistant)
        setError('')
    }

    const startDoctorEdit = (doctor) => {
        setSection('medecins')
        setEditingId(doctor.id)
        setFormType('medecin')

        setDoctorForm({
        nom: doctor.nom || '',
        prenom: doctor.prenom || '',
        email: doctor.email || '',
        telephone: doctor.telephone || '',
        specialite: doctor.medecin?.specialite || '',
        description: doctor.medecin?.description || '',
        })

        setError('')
        setSuccess('')
    }

    const startAssistantEdit = (assistant) => {
        setSection('assistants')
        setEditingId(assistant.id)
        setFormType('assistant')

        setAssistantForm({
        nom: assistant.nom || '',
        prenom: assistant.prenom || '',
        email: assistant.email || '',
        telephone: assistant.telephone || '',
        type_assistant: assistant.assistant?.type_assistant || 'RECEPTION',
        medecin_id: assistant.assistant?.medecin_id
            ? String(assistant.assistant.medecin_id)
            : '',
        })

        setError('')
        setSuccess('')
    }

    const handleDoctorSubmit = async (event) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')
        setTemporaryPassword('')

        try {
        const response = editingId
            ? await api.put(`/admin/medecins/${editingId}`, doctorForm)
            : await api.post('/admin/medecins', doctorForm)

        if (response.data.temporary_password) {
            setTemporaryPassword(response.data.temporary_password)
        }

        setSuccess(response.data.message || 'Opération effectuée avec succès.')
        closeForm()
        await loadData()
        } catch (err) {
        const errors = err.response?.data?.errors
        setError(
            (errors && Object.values(errors).flat()[0]) ||
            err.response?.data?.message ||
            'Une erreur est survenue.'
        )
        } finally {
        setSaving(false)
        }
    }

    const handleAssistantSubmit = async (event) => {
        event.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')
        setTemporaryPassword('')

        const payload = {
        ...assistantForm,
        medecin_id: assistantForm.type_assistant === 'SPECIALISE'
            ? Number(assistantForm.medecin_id)
            : null,
        }

        try {
        const response = editingId
            ? await api.put(`/admin/assistants/${editingId}`, payload)
            : await api.post('/admin/assistants', payload)

        if (response.data.temporary_password) {
            setTemporaryPassword(response.data.temporary_password)
        }

        setSuccess(response.data.message || 'Opération effectuée avec succès.')
        closeForm()
        await loadData()
        } catch (err) {
        const errors = err.response?.data?.errors
        setError(
            (errors && Object.values(errors).flat()[0]) ||
            err.response?.data?.message ||
            'Une erreur est survenue.'
        )
        } finally {
        setSaving(false)
        }
    }

    const handleStatus = async (type, id, action) => {
        const label = action === 'desactiver' ? 'désactiver' : 'réactiver'

        if (!window.confirm(`Voulez-vous vraiment ${label} ce compte ?`)) {
        return
        }

        setError('')
        setSuccess('')
        setTemporaryPassword('')

        try {
        const response = await api.patch(
            `/admin/${type}/${id}/${action}`
        )

        setSuccess(response.data.message || 'Opération effectuée avec succès.')
        await loadData()
        } catch (err) {
        setError(err.response?.data?.message || 'Une erreur est survenue.')
        }
    }

    const handleResetPassword = async (type, id) => {
        if (!window.confirm('Voulez-vous réinitialiser le mot de passe de ce compte ?')) {
        return
        }

        setError('')
        setSuccess('')

        try {
        const response = await api.post(
            `/admin/${type}/${id}/reinitialiser-mot-de-passe`
        )

        setTemporaryPassword(response.data.temporary_password || '')
        setSuccess(response.data.message || 'Mot de passe réinitialisé.')
        } catch (err) {
        setError(err.response?.data?.message || 'Une erreur est survenue.')
        }
    }

    const handleLogout = async () => {
        try {
        await logout()
        } catch {
        // La session locale est supprimée même en cas d'erreur serveur.
        }
    }

    const activeDoctors = medecins.filter((item) => !item.deleted_at).length
    const activeAssistants = assistants.filter((item) => !item.deleted_at).length

    return (
        <div className="admin-layout">
        <aside className="admin-sidebar">
            <div className="sidebar-brand">
            <div className="brand-icon">+</div>
            <div>
                <strong>RendezVous</strong>
                <span>Clinique</span>
            </div>
            </div>

            <div className="sidebar-label">MENU PRINCIPAL</div>

            <button
            className={`sidebar-link ${section === 'dashboard' ? 'active' : ''}`}
            onClick={() => {
                setSection('dashboard')
                closeForm()
                setSearch('')
            }}
            >
            <span>▦</span> Tableau de bord
            </button>

            <button
            className={`sidebar-link ${section === 'medecins' ? 'active' : ''}`}
            onClick={() => {
                setSection('medecins')
                closeForm()
                setSearch('')
            }}
            >
            <span>⚕</span> Médecins
            </button>

            <button
            className={`sidebar-link ${section === 'assistants' ? 'active' : ''}`}
            onClick={() => {
                setSection('assistants')
                closeForm()
                setSearch('')
            }}
            >
            <span>♙</span> Assistants
            </button>

            <div className="sidebar-bottom">
            <div className="admin-profile">
                <div className="profile-avatar">A</div>
                <div>
                <strong>{user?.prenom} {user?.nom}</strong>
                <span>Administrateur</span>
                </div>
            </div>

            <button className="logout-button" onClick={handleLogout}>
                ↪ Déconnexion
            </button>
            </div>
        </aside>

        <main className="admin-main">
            <header className="admin-topbar">
            <div>
                <span className="breadcrumb">Administration /</span>
                <strong>
                {section === 'dashboard'
                    ? 'Tableau de bord'
                    : section === 'medecins'
                    ? 'Gestion des médecins'
                    : 'Gestion des assistants'}
                </strong>
            </div>
            <div className="topbar-date">Espace administrateur</div>
            </header>

            <div className="admin-content">
            {error && (
                <div className="admin-alert error-alert">
                {error}
                <button onClick={() => setError('')}>×</button>
                </div>
            )}

            {success && (
                <div className="admin-alert success-alert">
                {success}
                <button onClick={() => setSuccess('')}>×</button>
                </div>
            )}

            {temporaryPassword && (
                <div className="password-result">
                <strong>Mot de passe temporaire</strong>
                <p>Communiquez-le au titulaire du compte de manière sécurisée.</p>
                <div className="password-value">
                    <code>{temporaryPassword}</code>
                    <button
                    onClick={() => navigator.clipboard.writeText(temporaryPassword)}
                    >
                    Copier
                    </button>
                </div>
                <button
                    className="close-password"
                    onClick={() => setTemporaryPassword('')}
                >
                    Fermer
                </button>
                </div>
            )}

            {section === 'dashboard' && (
                <>
                <div className="page-heading">
                    <div>
                    <h1>Tableau de bord</h1>
                    <p>Bienvenue dans votre espace d'administration.</p>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                    <span className="stat-icon blue">⚕</span>
                    <div>
                        <span>Médecins actifs</span>
                        <strong>{activeDoctors}</strong>
                    </div>
                    </div>

                    <div className="stat-card">
                    <span className="stat-icon purple">♙</span>
                    <div>
                        <span>Assistants actifs</span>
                        <strong>{activeAssistants}</strong>
                    </div>
                    </div>

                    <div className="stat-card">
                    <span className="stat-icon green">✓</span>
                    <div>
                        <span>Total des comptes</span>
                        <strong>{medecins.length + assistants.length}</strong>
                    </div>
                    </div>
                </div>

                <div className="welcome-panel">
                    <h2>Bienvenue, {user?.prenom} !</h2>
                    <p>
                    Depuis cet espace, vous pouvez gérer les comptes des médecins
                    et des assistants de la clinique.
                    </p>
                    <button onClick={() => setSection('medecins')}>
                    Gérer les médecins
                    </button>
                    <button onClick={() => setSection('assistants')}>
                    Gérer les assistants
                    </button>
                </div>
                </>
            )}

            {section !== 'dashboard' && (
                <>
                <div className="page-heading">
                    <div>
                    <h1>
                        {section === 'medecins' ? 'Gestion des médecins' : 'Gestion des assistants'}
                    </h1>
                    <p>
                        Gérez les comptes, les informations et les accès.
                    </p>
                    </div>

                    {!formType && (
                    <button
                        className="primary-button"
                        onClick={() => {
                        setEditingId(null)
                        setError('')
                        setFormType(section === 'medecins' ? 'medecin' : 'assistant')
                        setDoctorForm(emptyDoctor)
                        setAssistantForm(emptyAssistant)
                        }}
                    >
                        + Ajouter {section === 'medecins' ? 'un médecin' : 'un assistant'}
                    </button>
                    )}
                </div>

                {formType && (
                    <section className="admin-panel form-panel">
                    <div className="panel-heading">
                        <div>
                        <h2>
                            {editingId ? 'Modifier le compte' : 'Nouveau compte'}
                        </h2>
                        <p>Veuillez remplir les informations ci-dessous.</p>
                        </div>
                        <button className="icon-close" onClick={closeForm}>×</button>
                    </div>

                    <form
                        onSubmit={formType === 'medecin'
                        ? handleDoctorSubmit
                        : handleAssistantSubmit}
                    >
                        <div className="admin-form-grid">
                        <label>
                            Nom
                            <input
                            required
                            value={formType === 'medecin' ? doctorForm.nom : assistantForm.nom}
                            onChange={(e) => formType === 'medecin'
                                ? setDoctorForm({ ...doctorForm, nom: e.target.value })
                                : setAssistantForm({ ...assistantForm, nom: e.target.value })}
                            />
                        </label>

                        <label>
                            Prénom
                            <input
                            required
                            value={formType === 'medecin' ? doctorForm.prenom : assistantForm.prenom}
                            onChange={(e) => formType === 'medecin'
                                ? setDoctorForm({ ...doctorForm, prenom: e.target.value })
                                : setAssistantForm({ ...assistantForm, prenom: e.target.value })}
                            />
                        </label>

                        <label>
                            Adresse e-mail
                            <input
                            type="email"
                            required
                            value={formType === 'medecin' ? doctorForm.email : assistantForm.email}
                            onChange={(e) => formType === 'medecin'
                                ? setDoctorForm({ ...doctorForm, email: e.target.value })
                                : setAssistantForm({ ...assistantForm, email: e.target.value })}
                            />
                        </label>

                        <label>
                            Téléphone
                            <input
                            value={formType === 'medecin' ? doctorForm.telephone : assistantForm.telephone}
                            onChange={(e) => formType === 'medecin'
                                ? setDoctorForm({ ...doctorForm, telephone: e.target.value })
                                : setAssistantForm({ ...assistantForm, telephone: e.target.value })}
                            />
                        </label>

                        {formType === 'medecin' ? (
                            <>
                            <label>
                                Spécialité
                                <input
                                required
                                value={doctorForm.specialite}
                                onChange={(e) => setDoctorForm({
                                    ...doctorForm,
                                    specialite: e.target.value,
                                })}
                                />
                            </label>

                            <label className="full-width">
                                Description
                                <textarea
                                rows="3"
                                value={doctorForm.description}
                                onChange={(e) => setDoctorForm({
                                    ...doctorForm,
                                    description: e.target.value,
                                })}
                                />
                            </label>
                            </>
                        ) : (
                            <>
                            <label>
                                Type d'assistant
                                <select
                                value={assistantForm.type_assistant}
                                onChange={(e) => setAssistantForm({
                                    ...assistantForm,
                                    type_assistant: e.target.value,
                                    medecin_id: '',
                                })}
                                >
                                <option value="RECEPTION">Réception générale</option>
                                <option value="SPECIALISE">Assistant spécialisé</option>
                                </select>
                            </label>

                            {assistantForm.type_assistant === 'SPECIALISE' && (
                                <label>
                                Médecin associé
                                <select
                                    required
                                    value={assistantForm.medecin_id}
                                    onChange={(e) => setAssistantForm({
                                    ...assistantForm,
                                    medecin_id: e.target.value,
                                    })}
                                >
                                    <option value="">Choisir un médecin</option>
                                    {medecins
                                    .filter((doctor) => !doctor.deleted_at)
                                    .map((doctor) => (
                                        <option
                                        key={doctor.medecin?.id}
                                        value={doctor.medecin?.id}
                                        >
                                        Dr {doctor.prenom} {doctor.nom}
                                        </option>
                                    ))}
                                </select>
                                </label>
                            )}
                            </>
                        )}
                        </div>

                        <div className="form-actions">
                        <button type="button" className="secondary-button" onClick={closeForm}>
                            Annuler
                        </button>
                        <button type="submit" className="primary-button" disabled={saving}>
                            {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Créer le compte'}
                        </button>
                        </div>
                    </form>
                    </section>
                )}

                <section className="admin-panel">
                    <div className="panel-heading list-heading">
                    <div>
                        <h2>
                        {section === 'medecins' ? 'Liste des médecins' : 'Liste des assistants'}
                        </h2>
                        <p>
                        {section === 'medecins'
                            ? `${medecins.length} compte(s)`
                            : `${assistants.length} compte(s)`}
                        </p>
                    </div>

                    <input
                        className="search-input"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    </div>

                    {loading ? (
                    <div className="empty-state">Chargement des données...</div>
                    ) : section === 'medecins' ? (
                    filteredDoctors.length === 0 ? (
                        <div className="empty-state">Aucun médecin trouvé.</div>
                    ) : (
                        <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Médecin</th>
                                <th>Spécialité</th>
                                <th>E-mail</th>
                                <th>Téléphone</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredDoctors.map((doctor) => (
                                <tr key={doctor.id}>
                                <td>
                                    <strong>Dr {doctor.prenom} {doctor.nom}</strong>
                                </td>
                                <td>{doctor.medecin?.specialite || '—'}</td>
                                <td>{doctor.email}</td>
                                <td>{doctor.telephone || '—'}</td>
                                <td>
                                    <span className={`status-badge ${doctor.deleted_at ? 'inactive' : 'active'}`}>
                                    {doctor.deleted_at ? 'Désactivé' : 'Actif'}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                    <button onClick={() => startDoctorEdit(doctor)}>Modifier</button>
                                    <button onClick={() => handleResetPassword('medecins', doctor.id)}>
                                        Réinitialiser MDP
                                    </button>
                                    {doctor.deleted_at ? (
                                        <button className="activate-action" onClick={() => handleStatus('medecins', doctor.id, 'reactiver')}>
                                        Réactiver
                                        </button>
                                    ) : (
                                        <button className="danger-action" onClick={() => handleStatus('medecins', doctor.id, 'desactiver')}>
                                        Désactiver
                                        </button>
                                    )}
                                    </div>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    )
                    ) : (
                    filteredAssistants.length === 0 ? (
                        <div className="empty-state">Aucun assistant trouvé.</div>
                    ) : (
                        <div className="table-wrapper">
                        <table className="admin-table">
                            <thead>
                            <tr>
                                <th>Assistant</th>
                                <th>Type</th>
                                <th>Médecin associé</th>
                                <th>E-mail</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredAssistants.map((assistant) => (
                                <tr key={assistant.id}>
                                <td><strong>{assistant.prenom} {assistant.nom}</strong></td>
                                <td>{assistant.assistant?.type_assistant === 'SPECIALISE' ? 'Spécialisé' : 'Réception'}</td>
                                <td>
                                    {assistant.assistant?.medecin?.user
                                    ? `Dr ${assistant.assistant.medecin.user.prenom} ${assistant.assistant.medecin.user.nom}`
                                    : '—'}
                                </td>
                                <td>{assistant.email}</td>
                                <td>
                                    <span className={`status-badge ${assistant.deleted_at ? 'inactive' : 'active'}`}>
                                    {assistant.deleted_at ? 'Désactivé' : 'Actif'}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                    <button onClick={() => startAssistantEdit(assistant)}>Modifier</button>
                                    <button onClick={() => handleResetPassword('assistants', assistant.id)}>
                                        Réinitialiser MDP
                                    </button>
                                    {assistant.deleted_at ? (
                                        <button className="activate-action" onClick={() => handleStatus('assistants', assistant.id, 'reactiver')}>
                                        Réactiver
                                        </button>
                                    ) : (
                                        <button className="danger-action" onClick={() => handleStatus('assistants', assistant.id, 'desactiver')}>
                                        Désactiver
                                        </button>
                                    )}
                                    </div>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        </div>
                    )
                    )}
                </section>
                </>
            )}
            </div>
        </main>
        </div>
    )
    }

export default AdminDashboard

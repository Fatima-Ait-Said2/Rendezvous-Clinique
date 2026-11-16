import PortalLayout from '../components/PortalLayout'
import { PortalEmpty, PortalNotice, PortalPanel, PortalStat } from '../components/PortalElements'

const menu = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '⌂', heading: 'Tableau de bord', description: 'Vue générale de votre activité au sein de la clinique.' },
  { id: 'rendez-vous', label: 'Rendez-vous', icon: '▦', heading: 'Gestion des rendez-vous', description: 'Consultez et organisez les rendez-vous des patients.' },
  { id: 'patients', label: 'Patients', icon: '♙', heading: 'Gestion des patients', description: 'Créez un compte patient et retrouvez les informations autorisées.' },
  { id: 'dossiers', label: 'Dossiers médicaux', icon: '▤', heading: 'Dossiers médicaux', description: 'Accès en lecture seule selon votre type d’assistant.' },
  { id: 'notifications', label: 'Notifications', icon: '♧', heading: 'Notifications', description: 'Consultez les notifications internes.' },
]

function AssistantDashboard() {
  return (
    <PortalLayout
      roleLabel="Espace assistant"
      title="Espace assistant"
      subtitle="Bienvenue dans votre espace professionnel."
      menu={menu}
    >
      {(section) => {
        if (section === 'dashboard') {
          return (
            <>
              <div className="portal-stats-grid">
                <PortalStat icon="▦" label="Rendez-vous à traiter" />
                <PortalStat icon="♙" label="Patients enregistrés aujourd’hui" tone="purple" />
                <PortalStat icon="◷" label="Rendez-vous en attente" tone="orange" />
                <PortalStat icon="♧" label="Notifications non lues" tone="green" />
              </div>
              <PortalPanel title="Bienvenue dans votre espace" description="Les outils de gestion administrative sont regroupés ici.">
                <div className="portal-welcome">
                  <div className="portal-welcome-symbol">♙</div>
                  <div>
                    <h3>Accompagner les patients et organiser les rendez-vous</h3>
                    <p>Vous pourrez créer les comptes des patients et gérer les rendez-vous conformément aux autorisations de votre profil.</p>
                  </div>
                </div>
              </PortalPanel>
              <PortalNotice>Les dossiers médicaux sont en lecture seule et uniquement accessibles à l’assistant spécialisé pour les patients du médecin auquel il est rattaché.</PortalNotice>
            </>
          )
        }

        const content = {
          'rendez-vous': ['▦', 'Aucun rendez-vous affiché', 'Les rendez-vous autorisés pour votre profil apparaîtront ici. Vous pourrez ensuite réserver un créneau pour un patient.'],
          patients: ['♙', 'Gestion des patients', 'Cette rubrique accueillera le formulaire de création d’un compte patient et la recherche des patients.'],
          dossiers: ['▤', 'Accès aux dossiers médicaux', 'Cette rubrique sera disponible uniquement pour les assistants spécialisés, en lecture seule et dans le périmètre du médecin associé.'],
          notifications: ['♧', 'Aucune notification affichée', 'Les notifications internes de la clinique apparaîtront ici.'],
        }[section]

        return (
          <PortalPanel>
            <PortalEmpty
              icon={content[0]}
              title={content[1]}
              description={content[2]}
              note="Interface en préparation — les données réelles seront connectées lors de la phase d’intégration."
            />
          </PortalPanel>
        )
      }}
    </PortalLayout>
  )
}

export default AssistantDashboard

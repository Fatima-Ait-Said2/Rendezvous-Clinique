import PortalLayout from '../components/PortalLayout'
import { PortalEmpty, PortalNotice, PortalPanel, PortalStat } from '../components/PortalElements'

const menu = [
  { id: 'dashboard', label: 'Tableau de bord', icon: '⌂', heading: 'Tableau de bord', description: 'Retrouvez les informations essentielles de votre espace patient.' },
  { id: 'prendre-rdv', label: 'Prendre rendez-vous', icon: '+', heading: 'Prendre un rendez-vous', description: 'Recherchez un médecin et choisissez un créneau disponible.' },
  { id: 'rendez-vous', label: 'Mes rendez-vous', icon: '▦', heading: 'Mes rendez-vous', description: 'Consultez, modifiez ou annulez vos rendez-vous.' },
  { id: 'dossier', label: 'Mon dossier médical', icon: '▤', heading: 'Mon dossier médical', description: 'Consultez les informations de votre dossier médical.' },
  { id: 'ordonnances', label: 'Mes ordonnances', icon: '▧', heading: 'Mes ordonnances', description: 'Retrouvez les prescriptions établies par vos médecins.' },
  { id: 'notifications', label: 'Notifications', icon: '♧', heading: 'Mes notifications', description: 'Suivez les rappels et les informations de la clinique.' },
]

function PatientDashboard() {
  return (
    <PortalLayout
      roleLabel="Espace patient"
      title="Espace patient"
      subtitle="Bienvenue dans votre espace santé."
      menu={menu}
    >
      {(section) => {
        if (section === 'dashboard') {
          return (
            <>
              <div className="portal-stats-grid patient-stats">
                <PortalStat icon="▦" label="Mes rendez-vous à venir" />
                <PortalStat icon="◷" label="En attente de confirmation" tone="purple" />
                <PortalStat icon="▧" label="Mes ordonnances" tone="green" />
              </div>
              <PortalPanel title="Bienvenue dans votre espace patient" description="Gérez vos rendez-vous et retrouvez vos informations médicales.">
                <div className="portal-welcome">
                  <div className="portal-welcome-symbol">♡</div>
                  <div>
                    <h3>Votre santé, en toute simplicité</h3>
                    <p>Vous pourrez rechercher un médecin, réserver un créneau, suivre vos rendez-vous et consulter les documents médicaux mis à votre disposition.</p>
                  </div>
                </div>
              </PortalPanel>
              <PortalNotice>La modification ou l’annulation d’un rendez-vous sera proposée dans le respect du délai minimum de 24 heures prévu par le projet.</PortalNotice>
            </>
          )
        }

        const content = {
          'prendre-rdv': ['+', 'Réservation de rendez-vous', 'La recherche des médecins, des spécialités et des créneaux disponibles sera proposée dans cette rubrique.'],
          'rendez-vous': ['▦', 'Aucun rendez-vous affiché', 'Vos rendez-vous à venir et passés apparaîtront ici avec leur statut.'],
          dossier: ['▤', 'Votre dossier médical', 'Les informations de votre dossier médical apparaîtront ici, en consultation personnelle.'],
          ordonnances: ['▧', 'Aucune ordonnance affichée', 'Les ordonnances établies par vos médecins apparaîtront ici.'],
          notifications: ['♧', 'Aucune notification affichée', 'Les rappels de rendez-vous et les notifications internes apparaîtront ici.'],
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

export default PatientDashboard

# RendezVousClinique
Application web de gestion des rendez-vous médicaux au sein d'une clinique.

## Description
RendezVousClinique est une application web destinée à faciliter la gestion des rendez-vous médicaux et à organiser les interactions entre les différents acteurs d'une clinique.

Projet académique développé avec Laravel, React et MySQL.
## Technologies utilisées

### Backend
- PHP 8.5
- Laravel 13
- Laravel Sanctum

### Frontend
- React 19
- Vite
- Axios
- React Router

### Base de données et environnement
- MySQL 8.4
- Docker
- Docker Compose

## Acteurs du système

- Administrateur : gestion des médecins et des assistants.
- Médecin : gestion des rendez-vous et des dossiers médicaux.
- Assistant : gestion des patients et des rendez-vous selon ses permissions.
- Patient : inscription et gestion de ses rendez-vous.

## Fonctionnalités
Le projet est actuellement en cours de développement.

Les fonctionnalités sont développées progressivement selon
les exigences du cahier des charges.
## Installation et lancement

1. Cloner le dépôt :
```bash 
    git clone https://github.com/Fatima-Ait-Said2/Rendezvous-Clinique.git
```
2. Accéder au dossier :
    ```bash
   	cd Rendezvous-Clinique
   ```


3. Configurer les variables d'environnement


Créer les fichiers locaux à partir des exemples :

copy backend\.env.example backend\.env
copy database\.env.example database\.env
Configurer les mots de passe dans les deux fichiers :

backend/.env : DB_PASSWORD

database/.env : MYSQL_PASSWORD et MYSQL_ROOT_PASSWORD

DB_PASSWORD et MYSQL_PASSWORD doivent avoir la même valeur.
4. Construire et démarrer les conteneurs

docker compose up -d --build
5. Générer la clé Laravel
docker compose run --rm backend php artisan key:generate


6. Initialiser la base de données

Pour une nouvelle installation, exécuter les migrations :

docker compose exec backend php artisan migrate

Accéder à l'application

Frontend : http://localhost:5173

Backend : http://localhost:8000

## Sécurité


Les fichiers contenant des informations sensibles, notamment les mots de passe, les clés secrètes et les fichiers .env, ne doivent jamais être publiés dans le dépôt.

## Statut

Projet académique en cours de développement.
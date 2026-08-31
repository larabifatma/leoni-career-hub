# Portail Carrière — Application Web de Recrutement

Projet de stage d'été — application web permettant à une entreprise de publier ses
offres d'emploi et de recevoir les candidatures en ligne.

**Stack technique :** React (Vite) · Node.js / Express · Supabase (PostgreSQL + Storage)

---

## 1. Architecture

```
React (Vite)  ──Axios/HTTP──▶  Express (API REST)  ──SDK──▶  Supabase (PostgreSQL + Storage)
   port 5173                       port 5000
```

**Règle d'or :** le frontend ne parle jamais directement à Supabase. Seul le backend
détient les clés Supabase ; React ne connaît que l'URL de l'API Express.

```
portail-carriere/
├── backend/
│   └── src/
│       ├── config/        supabaseClient.js (client unique), constantes.js
│       ├── middlewares/   auth (JWT), upload (Multer/CV), erreur (gestion centralisée)
│       ├── routes/        URLs uniquement — auth, offres, candidatures, rh
│       ├── controllers/   logique métier (validation, Supabase, réponse HTTP)
│       ├── scripts/       seedRh.js (compte RH), seedOffres.js (données de démo)
│       ├── app.js         assemblage d'Express
│       └── server.js      démarrage du serveur
└── frontend/
    └── src/
        ├── services/      appels à l'API (axiosClient, auth, offres, candidatures)
        ├── components/    éléments réutilisables (Entete, OffreCard, StatutBadge…)
        ├── pages/         une page = un écran de l'application
        ├── styles/        index.css (feuille de style unique)
        ├── App.jsx        déclaration des routes
        └── main.jsx       point d'entrée React
```

---

## 2. Démarrage

### Prérequis
Node.js installé, et les fichiers `.env` remplis (voir `.env.example` dans chaque dossier).

### Première installation (une seule fois)

```bash
# Dépendances
cd backend  && npm install
cd ../frontend && npm install

# Création du compte RH unique en base
cd ../backend && npm run seed

# (Optionnel) Quelques offres d'exemple pour la démonstration
npm run seed:offres
```

### Lancement quotidien — **deux terminaux en parallèle**

**Terminal 1 — Backend :**
```bash
cd backend
npm run dev
```
→ `Serveur backend démarré sur http://localhost:5000`

**Terminal 2 — Frontend :**
```bash
cd frontend
npm run dev
```
→ Ouvre automatiquement <http://localhost:5173>

### Identifiants du Responsable RH

| Champ | Valeur |
|---|---|
| Email | `rh@entreprise.com` |
| Mot de passe | `MonMotDePasseSolide123!` |

Ces valeurs sont définies dans `backend/src/scripts/seedRh.js`. Pour les changer :
modifiez l'objet `COMPTE_RH` en haut du fichier, puis relancez `npm run seed`.

---

## 3. Pages de l'application

### Espace Candidat (public, sans compte)
| URL | Écran |
|---|---|
| `/` | Accueil + 3 offres récentes |
| `/offres` | Liste des offres avec recherche et filtres |
| `/offres/:id` | Détail d'une offre |
| `/offres/:id/postuler` | Formulaire de candidature + dépôt du CV |
| `/candidature-envoyee` | Confirmation d'envoi |

### Espace RH (privé, jeton JWT obligatoire)
| URL | Écran |
|---|---|
| `/rh/connexion` | Connexion |
| `/rh/tableau-de-bord` | Statistiques + tableau des offres |
| `/rh/offres/nouvelle` | Création d'une offre |
| `/rh/offres/:id/modifier` | Modification d'une offre |
| `/rh/offres/:id/candidatures` | Candidatures reçues pour une offre |
| `/rh/candidatures` | Toutes les candidatures |
| `/rh/candidatures/:id` | Détail d'une candidature + CV + statut |

---

## 4. Documentation de l'API

Base : `http://localhost:5000/api`

### Routes publiques
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/offres` | Offres publiées. Paramètres : `motCle`, `typeContrat`, `lieu`, `page`, `limite` |
| `GET` | `/offres/filtres` | Valeurs disponibles pour les listes déroulantes |
| `GET` | `/offres/:id` | Détail d'une offre |
| `POST` | `/offres/:id/candidatures` | Postuler (`multipart/form-data`, champ fichier `cv`) |
| `POST` | `/auth/login` | Connexion RH → renvoie un jeton JWT |

### Routes privées — en-tête `Authorization: Bearer <token>`
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/auth/profil` | Vérifie la validité du jeton |
| `GET` | `/rh/statistiques` | Chiffres du tableau de bord |
| `GET` | `/rh/offres` | Toutes les offres + nombre de candidatures |
| `POST` | `/rh/offres` | Créer une offre |
| `GET` | `/rh/offres/:id` | Détail d'une offre (pour l'édition) |
| `PUT` | `/rh/offres/:id` | Modifier une offre |
| `PATCH` | `/rh/offres/:id/archiver` | Archiver / republier |
| `DELETE` | `/rh/offres/:id` | Supprimer définitivement |
| `GET` | `/rh/offres/:id/candidatures` | Candidatures d'une offre |
| `GET` | `/rh/candidatures` | Toutes les candidatures (filtres `statut`, `idOffre`) |
| `GET` | `/rh/candidatures/:id` | Détail d'une candidature |
| `GET` | `/rh/candidatures/:id/cv` | URL signée temporaire vers le CV (5 min) |
| `PATCH` | `/rh/candidatures/:id/statut` | Changer le statut |

> Conformément au cahier des charges, **aucune route d'inscription** (`/auth/register`)
> n'est exposée : le compte RH unique est créé par le script de seeding.

### Codes HTTP utilisés
`200` succès · `201` créé · `400` données invalides · `401` non authentifié ·
`404` introuvable · `409` doublon (F07) · `500` erreur serveur

---

## 5. Couverture du cahier des charges

| ID | Besoin | Où c'est implémenté |
|---|---|---|
| F01 | Liste des offres publiées | `pages/ListeOffres.jsx` · `listerOffresPubliques` |
| F02 | Recherche / filtrage | Barre de filtres + paramètres `motCle`, `typeContrat`, `lieu` |
| F03 | Détail d'une offre | `pages/DetailOffre.jsx` |
| F04 | Formulaire de candidature | `pages/FormulaireCandidature.jsx` |
| F05 | Dépôt du CV (PDF/Word, 5 Mo) | `upload.middleware.js` + validation côté React |
| F06 | Confirmation d'envoi | `pages/ConfirmationCandidature.jsx` |
| F07 | Anti double candidature | Contrainte unique `(id_offre, id_candidat)` + contrôle applicatif → HTTP 409 |
| F08 | Authentification JWT | `auth.controller.js` (bcrypt + jsonwebtoken) |
| F08bis | Aucune inscription publique | Seulement `seedRh.js` ; aucune route `/register` |
| F09 | Expiration du jeton | `JWT_EXPIRATION` (8 h) + déconnexion automatique sur 401 |
| F10-F13 | CRUD des offres | `offres.controller.js` · `pages/FormulaireOffre.jsx` |
| F14 | Offres + nb de candidatures | `listerOffresRh` (jointure `Candidature(count)`) |
| F15 | Candidatures par offre | `pages/CandidaturesOffre.jsx` |
| F16 | Détail + téléchargement du CV | URL signée Supabase Storage (bucket privé) |
| F17 | Changement de statut | `pages/DetailCandidature.jsx` |
| F18 | Filtrer les candidatures | Recherche par nom/email + filtre par statut |

**Sécurité :** mot de passe haché (bcrypt), routes RH protégées par middleware JWT,
contrôle du type et de la taille des fichiers, validation systématique côté serveur,
bucket de CV privé accessible uniquement par URL signée temporaire.

---

## 6. Base de données

Quatre tables PostgreSQL (Supabase), clés primaires en UUID :

```
Compte_RH (1) ──< Offre (1) ──< Candidature >── (1) Candidat
```

Les CV ne sont pas stockés en base : le fichier est dans le bucket privé `cvs`
(Supabase Storage) et seul son chemin est enregistré dans `Candidature.cv_fichier`.

> ⚠️ Les fichiers `.env` ne doivent jamais être envoyés sur Git : ils contiennent la
> `service_role key` de Supabase. Ils sont exclus par `.gitignore`, et un
> `.env.example` documente les variables attendues.

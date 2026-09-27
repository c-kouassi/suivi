# SuiviPatient — suivi des troubles thyroïdiens

API REST + pages web pour le suivi, entre deux consultations, des patients atteints de
troubles thyroïdiens (hypothyroïdie / Hashimoto, hyperthyroïdie / Basedow, nodules,
post-thyroïdectomie) par leur endocrinologue. Un médecin génère un code d'invitation, le
patient crée son compte avec ce code et lui est rattaché automatiquement ; le patient
saisit ses check-in thyroïdiens, ses symptômes et ses bilans, le médecin voit remonter
les cas urgents et importants, suit les courbes (TSH, T4L, poids, FC), échange par
messagerie et partage des documents. Un assistant IA répond aux patients et aux médecins
à partir du dossier.

> Ce README décrit **l'état réel du code**. La cible d'architecture (Next.js + FastAPI +
> PostgreSQL), le design system et la roadmap 3 mois sont dans
> [`UPDATE -ARCHITECTURE_DS_ROADMAP_3_MOIS.md`](./UPDATE%20-ARCHITECTURE_DS_ROADMAP_3_MOIS.md).

## Stack

| Couche | Techno |
| --- | --- |
| Runtime | Node.js 20+ (teste sur 22), `type: commonjs` |
| API | Express 5 |
| ORM | Sequelize 6 |
| Base de données | MySQL 8 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Upload fichiers | `multer` (stockage disque `data/uploads/`) |
| Email | `nodemailer` (SMTP Gmail) — confirmation de compte |
| LLM chatbot | API Groq (OpenAI-compatible), modèle par défaut `qwen/qwen3.8-27b` |
| Front | Pages HTML/CSS/JS statiques servies depuis `public/` (aucun build) |
| Typographie / icônes | Hanken Grotesk (Google Fonts) · icônes SVG au trait inline (`LINE_ICONS` dans `public/js/app.js`) |
| Graphiques | SVG inline générés en JS (aucune librairie de charts) |
| Compagnon iOS | Pont SwiftUI HealthKit → API (`ios/HealthKitBridge/`) |

Le schéma est créé/mis à jour au démarrage par `config/init.js` via
`sequelize.sync({ alter: true })` — **pas de système de migrations**.

## Démarrage

### Prérequis

- Node.js 20+
- MySQL 8 en local (voir [`SETUP_MYSQL.md`](./SETUP_MYSQL.md))

### Installation

```bash
npm install
cp .env.example .env   # puis renseigner les valeurs
npm run dev             # node --watch server.js  (ou: npm start)
```

Au démarrage : connexion MySQL → `sync({ alter: true })` → écoute sur `0.0.0.0:$PORT`.
Le terminal affiche l'URL locale **et l'URL réseau à coller dans l'app iOS** :

```
📡 Local    : http://localhost:3000
📱 Réseau   : http://172.20.10.2:3000/api   ← à coller dans l'app iOS
```

L'iPhone et le Mac doivent être sur le même réseau **sans isolation client** (les Wi-Fi
d'école l'activent souvent). Le partage de connexion **depuis** l'iPhone ne marche pas
dans ce sens : iOS ne route pas le trafic du téléphone hôte vers un appareil branché sur
son propre hotspot. Pour une démo, un tunnel (`cloudflared tunnel --url http://localhost:3000`)
évite tous ces problèmes et fournit une URL HTTPS.

### Jeu de données de démo

```bash
npm run seed     # ⚠️ recrée TOUTES les tables (sync force:true) et vide data/uploads/
```

`seedDemo.js` remplit toute l'app pour une présentation : un cabinet d'endocrinologie
thyroïdienne — 1 médecin (`claire.lefevre@endoclinic.fr`, code `DOC-THYRO1`) et 5 patients
aux profils variés (Hashimoto, Basedow, post-thyroïdectomie, nodule sous surveillance,
hypothyroïdie fruste), chacun avec médicaments, rendez-vous passés/à venir, relevés de
symptômes, check-in thyroïde (dont des alertes), mesures Apple Watch, documents (déposés
par le patient et par le médecin), notifications, historique chatbot et fil de messagerie
avec le médecin. **Mot de passe commun : `demo1234`.**

> `initDb.js` est l'**ancien** script de seed (données cardiologiques, `force:true`). Il
> n'est plus à jour : utilisez `npm run seed`.

> **Un seul process à la fois.** Si le port est déjà pris, le serveur s'arrête avec
> « ❌ Le port 3000 est déjà utilisé » : `lsof -nP -iTCP:$PORT -sTCP:LISTEN` puis
> `kill <PID>`. Attention, ce peut être un `node server.js` **d'un autre projet** qui
> utilise aussi le port 3000. Un serveur laissé tourné ne recharge pas `.env` : après
> toute modif de `.env`, redémarrer.

## Variables d'environnement (`.env`)

| Variable | Rôle |
| --- | --- |
| `PORT` | Port HTTP (défaut 3000) |
| `JWT_SECRET` | Secret de signature JWT |
| `JWT_EXPIRES_IN` | Durée de validité du token (ex. `7d`) |
| `APP_BASE_URL` | URL publique, utilisée dans les liens des emails |
| `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_PORT` | Connexion MySQL |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Envoi des emails de confirmation |
| `GROQ_API_KEY` | Clé API Groq. Absente → le chatbot bascule sur la base de connaissances hors-ligne |
| `GROQ_MODEL` | Modèle Groq. **Doit exister dans le catalogue du compte** — un modèle décommissionné renvoie 404 et le chatbot retombe silencieusement sur les mots-clés |

## Structure

```
server.js              Point d'entrée : middlewares, montage des routes, pages statiques
config/
  database.js          Instance Sequelize (dialect mysql, pool)
  init.js              Associations + sync({ alter: true }) au boot
middleware/auth.js     authenticateToken : vérifie le Bearer JWT -> req.user
models/                Modèles Sequelize (voir ci-dessous)
routes/                Routeurs Express montés sous /api/*
utils/
  db.js  email.js      Helpers
public/                Front statique (chat.html, dashboard.html, documents.html, messages.html, ...)
data/uploads/          Fichiers des documents patients (hors git)
ios/HealthKitBridge/   Compagnon iPhone SwiftUI (lecture Apple Health -> POST /sync)
tests/                 Tests ad hoc (lancés à la main avec `node`)
```

### Modèles

`User` (patient|doctor, `doctorReferralCode`, `treatingDoctorId`, `registrationStatus`
toujours `approved`, `isEmailVerified`, `profile` JSON) · `Symptom` (`symptoms`/`vitals` JSON) ·
`Appointment` · `Medication` (`times` JSON) · `Document` (type surgery|prescription|exam|report|other,
`visibility` shared|private, fichier disque : `storedName`/`mimeType`/`size`, `uploadedByRole`) ·
`Notification` (type appointment|medication|alert|message) · `ChatMessage` (type user|ai) ·
`Message` (messagerie patient↔médecin : `patientId`+`doctorId`+`senderRole`, `readAt`) ·
`ThyroidCheckin` (`answers`/`measurements`/`reasons` JSON, `riskScore`, `category`
normal|surveillance|important|urgent) · `AppleHealthMeasurement` (journal immuable,
`syncId`, `externalId`, 17 types de mesures acceptés).

## API

Toutes les routes `/api/*` hors `login`/`register`/`confirm` exigent
`Authorization: Bearer <jwt>`.

### Auth — `routes/auth.js`

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| POST | `/api/auth/register` | Inscription. Patient : `doctorCode` obligatoire → rattachement auto, compte actif immédiatement (aucune validation par le médecin). Doctor : renvoie directement un token. |
| POST | `/api/auth/login` | Renvoie `{ token, user }`. Refuse si email non confirmé. |
| GET | `/api/auth/confirm/:token` | Confirmation d'email (lien reçu par mail). |
| GET | `/api/auth/me` | Profil courant. |
| POST | `/api/auth/doctor/referral-code` | (Re)génère le code d'invitation du médecin. |

### Médecin — `routes/doctors.js` (`ensureDoctor`)

`GET /me/patients`, `GET /me/patients/available`, `GET /me/overview` (KPI : nb patients,
RDV à venir, alertes non lues, documents partagés), `GET /me/patients/:id/medical-info`
(dossier agrégé, inclut les documents partagés), `POST /me/patients/:id/notify`,
`POST /me/patients/:id/appointments`, `PUT /me/patients/:id/assign` · `/unassign`.

Vues agrégées (alimentent les onglets du dashboard, cliquables depuis les cartes KPI) :

| Méthode | Chemin | Contenu |
| --- | --- | --- |
| GET | `/api/doctors/me/appointments` | RDV `upcoming`/`pending` à venir de tous ses patients (+ `patientName`) |
| GET | `/api/doctors/me/alerts` | Notifications `alert` non lues de tous ses patients (+ `patientName`) |
| GET | `/api/doctors/me/documents` | Documents `shared` de tous ses patients (+ `patientName`, `downloadUrl`) |
| GET | `/api/doctors/me/kpi` | **Cas prioritaires** (`priorityCases` : patients dont le dernier check-in est urgent/important, avec score, motifs, TSH/T4L/FC, alertes non lues ; `priorityCounts`) + répartition par statut + dernière TSH par patient (`inRange` vs 0,4–4,0) |
| GET | `/api/doctors/me/patients/:id/trends` | Séries temporelles d'un patient : check-in (TSH, T4L, T3L, FC, poids), symptômes (FC, poids, T°), Apple Watch (poids, FC repos) — pour les courbes SVG du dashboard |

Notifications du médecin (cloche du dashboard) :

| Méthode | Chemin | Contenu |
| --- | --- | --- |
| GET | `/api/doctors/me/notifications` | Fil unifié `{ unread, items }` : alertes de ses patients, **messages non lus groupés par patient**, documents partagés ces 7 derniers jours |
| PUT | `/api/doctors/me/alerts/:id/read` | Marque une alerte comme lue (404 si le patient n'est pas le sien) |
| PUT | `/api/doctors/me/alerts/read-all` | Marque toutes ses alertes comme lues |

Les messages ne se marquent pas depuis la cloche : ils passent en lu à l'ouverture du fil.

> Il n'y a **pas** de validation d'inscription par le médecin : un patient qui s'inscrit
> avec un code valide est actif immédiatement.

### Patient

- `routes/patients.js` :
  - `GET /api/patients/notifications` (50 dernières) · `PUT /api/patients/notifications/:id/read` · `PUT /api/patients/notifications/read-all`
  - `GET /api/patients` : renvoie les documents du patient (doublon historique de `GET /api/documents`)
- `routes/symptoms.js` : `GET` · `POST` · `GET /latest`
- `routes/medications.js` : `GET` · `POST` · `PUT /:id` · `DELETE /:id`
- `routes/appointments.js` : `GET` · `POST` · `PUT /:id` · `DELETE /:id`

### Documents — `routes/documents.js`

Upload / téléchargement / partage des documents du patient. Fichiers stockés sur disque
dans `data/uploads/documents/` (hors git), 10 Mo max, types autorisés : PDF, image
(jpg/png/webp/heic), Word (doc/docx), texte.

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| POST | `/api/documents` | Upload `multipart/form-data`, champ `file` (+ `name`, `type`, `description`, `visibility`). Patient → son dossier. Médecin → `patientId` requis (doit être son patient). |
| GET | `/api/documents` | Patient : ses documents. Médecin : `?patientId=` (documents `shared` de son patient). |
| GET | `/api/documents/:id` | Métadonnées d'un document. |
| GET | `/api/documents/:id/download` | Télécharge le fichier (`?inline=1` pour affichage navigateur). |
| PATCH | `/api/documents/:id` | Patient propriétaire : renommer, décrire, changer le type ou `visibility` (`shared` / `private`). |
| DELETE | `/api/documents/:id` | Patient propriétaire ou médecin traitant. Supprime aussi le fichier disque. |

`visibility` : `shared` (défaut) = visible et téléchargeable par le médecin traitant ;
`private` = patient uniquement. Le médecin peut aussi **déposer un document dans le
dossier d'un de ses patients** (`POST` avec `patientId`, `uploadedByRole: 'doctor'`) ;
le patient le voit mais ne peut pas le supprimer.

### Messagerie — `routes/messages.js`

Conversation 1-à-1 entre un patient et son médecin traitant (fil identifié par le
couple `patientId` + `doctorId`).

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/api/messages` | Patient : son fil. Médecin : `?patientId=` requis. Marque au passage comme lus les messages reçus. |
| POST | `/api/messages` | `{ content, patientId? }` — patient → son médecin ; médecin → `patientId` (doit être son patient). |
| GET | `/api/messages/threads` | Médecin : liste des conversations (patient, dernier message, non-lus). |
| GET | `/api/messages/unread-count` | `{ count }` — alimente la pastille du menu. |

Page `/messages` (`public/messages.html`), role-aware : le patient voit sa conversation
unique, le médecin voit la liste des fils + la conversation. Rafraîchissement toutes les
10 s. `createdAt` en `DATETIME(6)` pour un ordre fiable des messages d'une même seconde.

### Check-in thyroïde — `routes/thyroidCheckins.js`

`GET /api/thyroid-checkins`, `GET /latest`, `POST /` — le POST calcule un `riskScore` et
une `category` via `classifyCheckin()` (règles sur signes d'alerte, FC, température, TSH,
T4L, sévérité des symptômes) et crée une `Notification` `alert` dans le dossier si la
catégorie n'est pas `normal`.

### Apple Health — `routes/appleHealth.js`

`POST /api/apple-health/sync` (journal immuable, dédoublonnage par `externalId`, lots
≤ 1000, alerte auto sur valeur aberrante), `GET /latest`, `GET /summary` (7 jours).
Détail du contrat dans [`APPLE_HEALTH_API.md`](./APPLE_HEALTH_API.md).

L'API accepte tous les types, mais **les dashboards n'affichent que ceux utiles au suivi
thyroïdien** (`THYROID_WATCH_METRICS` dans `public/dashboard.html`) : FC au repos, FC,
poids, saturation O₂, température, fréquence respiratoire. Pas, distance, étages, VO₂ max
etc. sont écartés. Chaque valeur est signalée quand elle sort des repères (FC repos > 90,
SpO₂ < 94, T° ≥ 38…).

### Assistant IA — `routes/chat.js`

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| GET | `/api/chat` | Historique des messages du patient. |
| POST | `/api/chat/send` | `{ content }` → `{ userMessage, aiResponse }`. |
| DELETE | `/api/chat/clear` | Purge l'historique. |

`POST /send` choisit la première source non vide :

1. **Réponse déterministe** depuis la base — uniquement pour une demande factuelle
   explicite (« quels sont mes médicaments », « qui est mon médecin traitant »…).
   Toute question de ressenti / symptôme / conseil est laissée au LLM.
2. **LLM Groq** avec prompt système patient/médecin + **contexte RAG** (profil, médecin
   traitant, médicaments, RDV, symptômes, dernier check-in thyroïde, mesures Apple
   Health, documents) + 12 derniers messages. Timeout 15 s, `max_tokens` 550, **3 essais
   avec back-off sur 429/5xx** (le tier gratuit Groq est plafonné à ~1000 tokens de
   sortie/minute — sans retry, le 2ᵉ message rapproché retombait sur les mots-clés).
3. **Base de connaissances par mots-clés** (repli hors-ligne) : douleur, médicaments,
   RDV, fatigue, alimentation, activité, cicatrice, cœur, thyroïde, psy, urgences.

## Interface (pages)

| Page | Contenu principal |
| --- | --- |
| `/` | Page d'accueil : illustration anatomique SVG de la thyroïde, pathologies suivies, fonctionnalités, aperçu du dashboard médecin |
| `/auth` | Connexion / inscription (code médecin). Les erreurs (« Identifiants incorrects », e-mail non confirmé) s'affichent sur le formulaire |
| `/dashboard` — patient | Cartes KPI cliquables (médicaments, RDV, FC, **dernière TSH**), check-in thyroïde guidé, mesures Apple Watch filtrées, **cloche de notifications** |
| `/dashboard` — médecin | Bloc **« Cas urgents et importants »** (triage), onglets Patients / RDV / Alertes (filtrables) / Documents, dossier patient avec **courbes TSH, T4L, poids, FC**, envoi de documents, cloche de notifications |
| `/symptoms` | Saisie de 24 symptômes thyroïdiens groupés (hypo / hyper / cou-yeux), évolution par semaine/mois/année, signes d'alerte, repères biologiques |
| `/medications` | Planning des prises + conseils de prise de la lévothyroxine et vigilance antithyroïdiens |
| `/appointments` | RDV avec types endocrino (bilan TSH/T4L, échographie, cytoponction, scintigraphie…) |
| `/documents` | Dépôt / téléchargement / partage avec le médecin |
| `/messages` | Messagerie patient ↔ médecin : séparateurs de jour, accusé « Vu », recherche de patient |
| `/chat` | Assistant IA |

Le client HTTP commun est `apiFetch()` (`public/js/app.js`) : une réponse 401/403 sur une
route protégée **avec** un jeton stocké renvoie à l'accueil (session expirée) ; sur les
routes `/auth/*` l'erreur remonte au formulaire.

## Déploiement (Railway)

Le projet est prêt pour Railway : `.nvmrc`, `engines`, `railway.json` (Nixpacks +
healthcheck sur `/`), et `config/database.js` accepte aussi bien `DB_*` que les
variables `MYSQL*` / `MYSQL_URL` injectées par le plugin MySQL de Railway.

1. **Créer le projet** depuis le dépôt GitHub (`choco-bain/suivi`).
2. **Ajouter le plugin MySQL** : Railway injecte `MYSQLHOST`, `MYSQLUSER`,
   `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQLPORT` — rien à recopier.
3. **Ajouter un volume** monté sur `/app/data/uploads`.
   ⚠️ **Sans volume, tous les documents patients sont perdus à chaque
   redéploiement** : le système de fichiers d'un conteneur est éphémère.
4. **Renseigner les variables** (onglet *Variables*) :

   | Variable | Valeur |
   | --- | --- |
   | `JWT_SECRET` | une chaîne aléatoire longue (`openssl rand -hex 32`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `APP_BASE_URL` | l'URL publique Railway (sert aux liens de confirmation e-mail) |
   | `GROQ_API_KEY` / `GROQ_MODEL` | clé Groq + `qwen/qwen3.8-27b` |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | compte d'envoi |

   `PORT` est fourni automatiquement par Railway — ne pas le définir.
5. **Premier démarrage** : `sync({ alter: true })` crée le schéma tout seul.
   Pour charger le jeu de démonstration, lancer `npm run seed` depuis le shell
   Railway (⚠️ il vide la base).

### Points connus avant une vraie mise en production

Cette configuration convient à une démonstration. Pour un usage réel il reste à
traiter : CORS ouvert à tous (`app.use(cors())`), absence de `helmet` et de rate
limiting, JWT longue durée stocké en `localStorage`, `sync({ alter: true })` au
démarrage à remplacer par des migrations, et 4 vulnérabilités `npm audit` de
niveau *high* (`mysql2`, `nodemailer`, `path-to-regexp`, `lodash`).

> **Données de santé.** L'application manipule des données de santé nominatives.
> En France, leur hébergement impose un hébergeur certifié **HDS**, ce que n'est
> pas Railway. À réserver à une démonstration avec les données fictives du seed.

## Tests

`npm test` n'est pas configuré (stub). Les tests présents se lancent à la main :

```bash
node tests/email.test.js
```

## Limitations connues

- La base de connaissances hors-ligne du chatbot (`AI_KNOWLEDGE_BASE`, `routes/chat.js`)
  contient encore des réponses héritées du suivi post-opératoire cardiaque (pontage,
  cicatrice) : elles ne servent que si le LLM est indisponible, mais restent à réécrire.
- Documents : stockage disque local uniquement (pas de S3/chiffrement), pas d'antivirus sur les fichiers.
- Messagerie sans temps réel : rafraîchissement par polling toutes les 10 s (pas de WebSocket).
- JWT unique longue durée, pas de refresh token ni de rate limiting.
- `sync({ alter: true })` au boot au lieu de migrations versionnées.
- Le chatbot conseille d'appeler le 15 mais ne crée pas d'alerte médecin en cas de pattern critique.

Suite prévue : voir la section 12 de
[`UPDATE -ARCHITECTURE_DS_ROADMAP_3_MOIS.md`](./UPDATE%20-ARCHITECTURE_DS_ROADMAP_3_MOIS.md).

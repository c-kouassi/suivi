# Architecture complete + Design System + Roadmap 3 mois

## 1) Resume executif

Ce document propose une architecture cible complete pour ton application de suivi patient en partant de ton existant actuel:

- Existant: Express + Sequelize + MySQL + pages HTML statiques.
- Cible: Next.js + Tailwind CSS + PostgreSQL + ORM SQLAlchemy (backend Python FastAPI).
- Workflow central: le medecin genere d abord un code d inscription, le patient cree ensuite son compte avec ce code, il est automatiquement rattache au medecin, puis le medecin suit ses constantes, fait des check-in, envoie des notifications, et recoit des alertes IA prioritisees.

## 2) Analyse de l existant (dossier actuel)

Points deja en place dans ton projet:

- Auth JWT avec roles `doctor` et `patient`.
- Code medecin (`doctorReferralCode`) deja implemente.
- Rattachement patient -> medecin via `treatingDoctorId`.
- Validation d inscription patient (pending/approved/rejected).
- Entites de base deja presentes: users, symptoms, appointments, medications, documents, notifications, chat messages.
- Routes medecin deja presentes pour:
  - lister ses patients
  - valider/refuser les inscriptions
  - creer rendez-vous
  - envoyer notifications
  - consulter infos medicales patient

Conclusion: tu as deja un excellent socle metier. La roadmap ci-dessous vise surtout:

1. la migration vers Next (frontend) + FastAPI (backend) + Postgres,
2. la structuration enterprise (domaines, modules, events),
3. le design system complet,
4. l ajout du moteur d alertes IA + chatbot clinique.

Pont concret entre l existant et la cible:

- Auth JWT, roles et rattachement patient-medecin existent deja dans le backend Express.
- Les ressources metier prioritaires sont deja en place: patients, rendez-vous, traitements, symptomes, documents, notifications, chat.
- La migration doit donc remplacer d abord l exposition API et la couche de persistance, pas re-penser tout le metier.
- Le backlog de refonte doit commencer par auth, onboarding, check-in, alertes, puis seulement le confort UI.

## 3) Vision cible (fonctionnelle)

### 3.1 Personas

- Medecin:
  - cree son compte
  - recoit/gere son code d inscription patient
  - valide/refuse demandes patient
  - consulte dashboard de constantes et alertes
  - envoie notifications et messages
  - fait check-in clinique

- Patient:
  - recoit un code genere par le medecin
  - cree son compte avec ce code
  - est automatiquement lie au medecin
  - saisit ses constantes/symptomes
  - voit ses rendez-vous, traitements, messages
  - recoit notifications

- IA Clinique (chatbot + moteur d alertes):
  - analyse constantes, symptomes, historique
  - detecte signaux de risque
  - cree des alertes priorisees
  - pousse les alertes vers le dashboard medecin

### 3.2 Parcours principal

1. Le medecin cree son compte.
2. Le medecin genere un code d invitation unique pour ses patients.
3. Le patient renseigne ce code au moment de son inscription.
4. Le systeme verifie le code, cree le compte patient, puis rattache automatiquement le patient au medecin.
5. Le patient passe en statut `pending` si le workflow de validation est active.
6. Le medecin valide ou refuse la demande d inscription.
7. Une fois le compte active, le patient saisit ses constantes en check-in quotidien ou hebdomadaire.
8. Le moteur IA evalue le niveau de risque.
9. Les alertes sont classees `critical`, `high`, `medium`, `low`.
10. Le medecin traite les alertes depuis le dashboard.

## 4) Architecture technique cible

## 4.1 Stack

- Frontend: Next.js (App Router) + Tailwind CSS + shadcn/ui (ou composants internes)
- Backend: FastAPI + services metier Python
- Base de donnees: PostgreSQL
- ORM: SQLAlchemy 2.0 + Alembic
- Auth: JWT (access + refresh) ou session securisee via FastAPI
- Cache / queue (phase 2): Redis + Celery/RQ
- IA:
  - inference regles + score risque (MVP)
  - puis modele ML supervise
- Observabilite: Sentry + OpenTelemetry + logs structures

## 4.2 Architecture logique (clean architecture simplifiee)

- `frontend/`:
  - pages Next, layouts, composants
- `backend/`:
  - routes FastAPI, services, repositories SQLAlchemy
- `features/`:
  - modules metier (auth, patients, checkins, alerts, notifications, chatbot)
- `entities/`:
  - definitions metier (types, enums, policies)
- `infrastructure/`:
  - SQLAlchemy, Redis, providers mail/sms/push, client IA
- `shared/`:
  - design system, utils, validation schemas, constants

Regle: la UI ne parle jamais directement a la base, elle passe par services -> repositories.

## 4.3 Structure de dossiers recommandee

```txt
frontend/
  src/
    app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (doctor)/
      dashboard/page.tsx
      patients/page.tsx
      alerts/page.tsx
      notifications/page.tsx
    (patient)/
      dashboard/page.tsx
      checkin/page.tsx
      medications/page.tsx
      appointments/page.tsx
      messages/page.tsx
    api/
      (optionnel: BFF leger)

backend/
  app/
    main.py
    api/
      v1/
        auth.py
        doctors.py
        patients.py
        checkins.py
        alerts.py
        notifications.py
        chatbot.py
    core/
      config.py
      security.py
    db/
      session.py
      base.py
    models/
      user.py
      doctor_profile.py
      patient_profile.py
      invitation_code.py
      doctor_patient_link.py
      checkin.py
      alert.py
      notification.py
    schemas/
      auth.py
      doctor.py
      patient.py
      checkin.py
      alert.py
    repositories/
    services/
    workers/
      alert_evaluator.py
  alembic/
  alembic.ini
```

## 5) Modele de donnees PostgreSQL (SQLAlchemy)

## 5.1 Entites coeur

- User
- DoctorProfile
- PatientProfile
- DoctorInvitationCode
- DoctorPatientLink
- CheckIn
- VitalMeasurement
- SymptomReport
- Medication
- MedicationIntake
- Appointment
- Notification
- Alert
- AlertEvent
- ChatMessage
- AIRecommendation
- AuditLog

## 5.2 Points schema importants

- Un medecin peut avoir plusieurs codes actifs (rotation possible).
- Un code peut expirer et avoir un `maxUses`.
- Le lien doctor-patient doit etre historise (actif/inactif, date debut/fin).
- Les constantes doivent etre timestampes et sourcees (manuel, wearable, import).
- Les alertes doivent avoir:
  - priorite (`critical|high|medium|low`)
  - statut (`open|acknowledged|in_progress|resolved|dismissed`)
  - score risque numerique
  - raison clinique explicable (texte)

## 5.3 Exemple de modeles SQLAlchemy 2.0 (base)

```python
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Enum, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Role(str, enum.Enum):
    DOCTOR = "DOCTOR"
    PATIENT = "PATIENT"
    ADMIN = "ADMIN"


class LinkStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    specialty: Mapped[str | None] = mapped_column(String(160), nullable=True)

    user: Mapped[User] = relationship()


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    birth_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped[User] = relationship()


class DoctorInvitationCode(Base):
    __tablename__ = "doctor_invitation_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id"), index=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DoctorPatientLink(Base):
    __tablename__ = "doctor_patient_links"
    __table_args__ = (UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id"), index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id"), index=True)
    status: Mapped[LinkStatus] = mapped_column(Enum(LinkStatus), default=LinkStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

## 6) Domaines metier et APIs

## 6.1 Auth + onboarding

- `POST /api/auth/register-doctor`
- `POST /api/auth/register-patient-with-code` (le code doit avoir ete genere par un medecin)
- `POST /api/auth/login`
- `GET /api/auth/me`

Regles:

- Patient sans code: refuse.
- Code invalide/expire: refuse.
- Creation patient -> lien auto avec medecin.
- Selon policy: activation immediate ou pending validation apres creation du compte.

## 6.2 Medecin

- `GET /api/doctors/me/dashboard`
- `GET /api/doctors/me/patients`
- `GET /api/doctors/me/patient-requests`
- `POST /api/doctors/me/patient-requests/:id/approve`
- `POST /api/doctors/me/patient-requests/:id/reject`
- `POST /api/doctors/me/notifications`

## 6.3 Patient

- `POST /api/checkins`
- `GET /api/checkins/me`
- `GET /api/patients/me/medications`
- `GET /api/patients/me/appointments`
- `GET /api/patients/me/notifications`

## 6.4 Alertes IA

- `POST /api/alerts/evaluate-checkin` (interne)
- `GET /api/doctors/me/alerts`
- `POST /api/alerts/:id/ack`
- `POST /api/alerts/:id/resolve`

## 7) Moteur IA + chatbot clinique

## 7.1 Architecture IA en 2 couches

- Couche A (MVP, obligatoire): regles medicales + seuils configurables
  - ex: saturation O2 < 92, temperature > 39, FC > 130, etc.
- Couche B (phase 2): score ML base sur historique patient

Sortie finale: `riskScore` + `priority` + `explanation` + `recommendedAction`.

## 7.2 Priorisation des alertes

Calcul type (MVP):

- `riskScore = score_constantes + score_symptomes + score_tendance + score_contexte`
- mapping:
  - 80-100 -> critical
  - 60-79 -> high
  - 30-59 -> medium
  - 0-29 -> low

Ajoute toujours:

- rationale explicable (pas de boite noire)
- garde-fous anti faux positifs
- confirmation humaine (medecin) avant actions critiques

## 7.3 Chatbot

Le chatbot ne remplace pas le medecin.

Roles:

- assister le patient pour saisir correctement ses constantes
- reformuler conseils non urgents
- pousser vers urgence si pattern critique detecte
- creer une alerte structuree pour le dashboard medecin

Base de connaissance:

- protocoles internes valides
- FAQ clinique
- historique patient (avec permissions)

RAG recommande (phase 2) pour citer les sources internes.

## 8) Design System complet

## 8.1 Principes UX

- Clair, rassurant, lisible en contexte medical.
- Actions critiques visuellement distinctes.
- Dashboard orientee priorites (pas juste jolies cartes).
- Mobile first pour patient, desktop first pour medecin.

## 8.2 Tokens design (Tailwind)

### Couleurs semantiques

- `bg.canvas`: fond global
- `bg.surface`: cartes
- `text.primary`, `text.secondary`
- `state.success`, `state.warning`, `state.danger`, `state.info`
- `priority.critical/high/medium/low`

### Echelles

- Espacements: 4, 8, 12, 16, 24, 32, 40, 48
- Radius: 8, 12, 16
- Ombres: sm, md, lg
- Typo:
  - Display: 32/40
  - H1: 28/36
  - H2: 24/32
  - H3: 20/28
  - Body: 16/24
  - Caption: 14/20

### Exemple `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F2F6FA",
        surface: "#FFFFFF",
        brand: {
          500: "#1B6CA8",
          600: "#155A8A"
        },
        state: {
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#3B82F6"
        },
        priority: {
          critical: "#B91C1C",
          high: "#DC2626",
          medium: "#D97706",
          low: "#2563EB"
        }
      },
      borderRadius: {
        md: "12px",
        lg: "16px"
      }
    }
  },
  plugins: []
};

export default config;
```

## 8.3 Composants fondamentaux

- Button: primary, secondary, ghost, danger
- Input, Select, Textarea, DatePicker
- Card, StatCard, EmptyState
- Badge: status et priorite
- DataTable (tri, filtre, pagination)
- Modal / Drawer
- Tabs
- Toast / Alert
- Timeline (check-ins)
- Chart wrappers (constantes)

Chaque composant doit avoir:

- etats hover/focus/disabled/error
- accessibilite clavier
- variantes taille `sm/md/lg`
- tests visuels (Storybook)

## 8.4 Composants metier

- PatientIdentityCard
- VitalSnapshotCard
- CheckInComposer
- AlertPriorityQueue
- AlertDetailPanel
- DoctorApprovalQueue
- MedicationAdherenceCard
- ChatbotAssistantPanel

## 8.5 Templates de pages

- Doctor Dashboard
- Doctor Patient Detail
- Alerts Center
- Patient Dashboard
- Patient Check-in
- Messages
- Parametres compte

## 9) Securite, conformite, gouvernance

- Hash mots de passe: Argon2 ou bcrypt cost eleve.
- RBAC strict sur toutes les routes.
- Journal audit pour actions sensibles:
  - validation patient
  - lecture dossier
  - changement traitement
  - cloture alerte
- Chiffrement des donnees sensibles au repos.
- Rotation secrets + politique MDP.
- Limitation de debit sur auth + endpoints sensibles.
- Strategie RGPD:
  - minimisation
  - retention
  - droit suppression/export

## 10) Observabilite et qualite

- Logs structures (JSON)
- Trace id par requete
- Metrics:
  - temps reponse API
  - taux erreurs
  - nb alertes par priorite
  - delai de prise en charge alerte
- Sentry pour erreurs front/back
- Tests:
  - unitaires (services)
  - integration (API + DB)
  - E2E (parcours doctor/patient)

## 11) Plan de migration depuis ton projet actuel

## 11.1 Strategie

- Conserver les regles metier existantes.
- Migrer par vertical slices (auth, patients, checkins, alerts).
- Faire coexister temporairement ancien backend et nouveau backend.

## 11.2 Etapes migration

1. Extraire les schemas Sequelize vers modeles SQLAlchemy.
2. Migrer MySQL -> PostgreSQL (script ETL).
3. Reimplementer endpoints critiques dans FastAPI.
4. Brancher frontend Next sur nouveaux endpoints FastAPI.
5. Desactiver progressivement anciennes routes Express.

## 12) Roadmap detaillee sur 3 mois (12 semaines)

## Mois 1 - Fondations solides

### Semaine 1

- Initialiser projet Next + Tailwind + FastAPI + SQLAlchemy + PostgreSQL.
- Setup lint, format, tests, CI.
- Definir architecture dossier finale.

Livrables:

- skeleton applicatif stable
- environnement dev/staging

### Semaine 2

- Implementer auth doctor/patient.
- Registration doctor + generation code invitation.
- Registration patient via code genere par le medecin + liaison auto.

Livrables:

- parcours d inscription complet
- e2e happy path inscription

### Semaine 3

- Workflow pending/approve/reject patient.
- Dashboard medecin minimal (patients + demandes en attente).
- Audit log initial.

Livrables:

- validation medecin operationnelle
- ecrans dashboard V1

### Semaine 4

- Design System V1:
  - tokens
  - composants core
  - storybook
- Integrer DS sur auth + dashboard V1.

Livrables:

- bibliotheque UI versionnee
- documentation DS initiale

## Mois 2 - Fonctions cliniques coeur

### Semaine 5

- Module check-in patient (constantes + symptomes + notes).
- Historique check-in patient.

Livrables:

- check-in create/read complet

### Semaine 6

- Module rendez-vous et traitements.
- Notifications medecin -> patient.

Livrables:

- parcours soin quotidien complet

### Semaine 7

- Dashboard medecin avance:
  - vue globale patients
  - details patient
  - tendances constantes

Livrables:

- cockpit medecin V2

### Semaine 8

- Alert engine V1 (regles medicales).
- Centre d alertes (tri + priorite + statut).

Livrables:

- alertes auto operationnelles
- SLA de traitement mesurable

## Mois 3 - IA, robustesse, go-live

### Semaine 9

- Chatbot clinique V1 (guidage saisie + triage simple).
- Escalade automatique vers alertes medecin.

Livrables:

- chatbot connecte aux check-ins et alertes

### Semaine 10

- Priorisation avancee (score risque enrichi historique).
- Parametrage seuils par medecin/service.

Livrables:

- pipeline priorisation V2

### Semaine 11

- Durcissement securite et conformite.
- Tests charge, tests resilience, plan reprise.

Livrables:

- checklist go-live validee

### Semaine 12

- Beta pilote.
- Correction bugs critiques.
- Preparation release production.

Livrables:

- version candidate production
- runbook exploitation

## 13) Backlog prioritaire (ordre recommande)

1. Auth + codes invitation medecin robustes.
2. Liaison auto patient-medecin + workflow validation.
3. Check-in constantes et visualisation dashboard.
4. Moteur alertes regles + priorisation.
5. Chatbot clinique et escalade medecin.
6. Hardening securite + audit + observabilite.

## 14) Definition of Done (DoD) par bloc

Un bloc est termine seulement si:

- tests unitaires et integration passent
- logs et erreurs sont observables
- roles et permissions verifies
- UX desktop + mobile validee
- doc technique et produit mise a jour

## 15) Recommandation finale


1. SQLAlchemy + Alembic + PostgreSQL,
2. Next App Router (frontend) + FastAPI (backend),
3. Alert engine base regles des le mois 2,
4. Chatbot assiste (pas autonome) en mois 3,
5. design system industrialise avec Storybook des le mois 1.

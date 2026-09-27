const express = require('express');
const authenticateToken = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const ThyroidCheckin = require('../models/ThyroidCheckin');
const AppleHealthMeasurement = require('../models/AppleHealthMeasurement');
const User = require('../models/User');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Symptom = require('../models/Symptom');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

// Base de connaissances IA post-hospitalisation
const AI_KNOWLEDGE_BASE = [
  {
    keywords: ['douleur', 'mal', 'douleurs', 'souffre', 'cicatrice'],
    response: `**Douleurs post-opératoires** 💊

Il est normal de ressentir des douleurs après une intervention chirurgicale, notamment au niveau de la cicatrice. Voici quelques conseils :

- Les douleurs légères à modérées (1-3/10) sont habituelles pendant les premières semaines
- Prenez votre traitement antidouleur prescrit aux heures indiquées
- Évitez les mouvements brusques et portez les vêtements amples
- Appliquez une légère pression avec un coussin lors de la toux

⚠️ **Consultez immédiatement** si vous ressentez une douleur thoracique intense, une douleur irradiant dans le bras gauche ou une difficulté respiratoire soudaine.`
  },
  {
    keywords: ['médicament', 'medicament', 'pilule', 'comprimé', 'traitement', 'oubli', 'dose'],
    response: `**Gestion de vos médicaments** 💊

Vos médicaments post-opératoires sont essentiels à votre rétablissement :

- Prenez-les exactement comme prescrit par votre médecin
- Ne modifiez jamais la dose sans avis médical
- En cas d'oubli : prenez le médicament dès que possible, sauf si l'heure suivante approche
- Consultez l'onglet **Médicaments** pour voir votre planning complet

🔔 Activez les rappels dans l'application pour ne jamais oublier une prise.

Vous avez des questions sur un médicament spécifique ?`
  },
  {
    keywords: ['rendez-vous', 'consultation', 'médecin', 'docteur', 'appointment'],
    response: `**Vos prochains rendez-vous** 📅

Un suivi médical régulier est crucial après votre hospitalisation :

- Votre prochaine consultation cardiologique est programmée le **18 mars à 14h30**
- N'oubliez pas de faire votre **bilan sanguin** avant ce rendez-vous
- En cas d'urgence, contactez le **15 (SAMU)** ou rendez-vous aux urgences

📋 Consultez l'onglet **Rendez-vous** pour voir et gérer tous vos rendez-vous.`
  },
  {
    keywords: ['fatigue', 'épuisé', 'fatigué', 'énergie', 'repos', 'sommeil'],
    response: `**Gestion de la fatigue** 😴

La fatigue est très normale après une opération cardiaque. Voici comment la gérer :

- **Respectez vos périodes de repos** : dormez 8h par nuit minimum
- **Activité progressive** : commencez par de courtes marches (5-10 min)
- **Évitez les efforts** : pas de port de charges lourdes pendant 6 semaines
- **Hydratation** : buvez au moins 1,5L d'eau par jour

📈 Votre énergie reviendra progressivement. La plupart des patients retrouvent une bonne forme après 4-6 semaines.

En cas de fatigue extrême ou soudaine, contactez votre médecin.`
  },
  {
    keywords: ['alimentation', 'régime', 'manger', 'nourriture', 'repas', 'sel', 'alcool'],
    response: `**Alimentation post-cardiaque** 🥗

Une bonne alimentation accélère votre rétablissement :

- **Réduisez le sel** : moins de 5g/jour (évitez les plats préparés)
- **Limitez les graisses saturées** : évitez les fritures, charcuteries, fromages gras
- **Mangez des oméga-3** : poissons gras (saumon, maquereau) 2x/semaine
- **Fruits et légumes** : minimum 5 portions par jour
- **Alcool** : abstinence totale pendant la convalescence

🍊 Préférez les cuissons à la vapeur ou au four. Un suivi avec un nutritionniste peut être bénéfique.`
  },
  {
    keywords: ['sport', 'activité physique', 'exercice', 'marche', 'rééducation', 'kiné'],
    response: `**Reprise de l'activité physique** 🚶

La rééducation cardiaque est une étape clé de votre rétablissement :

**Phase 1 (semaines 1-2) :**
- Marche légère 5-10 minutes, 2-3 fois/jour
- Exercices respiratoires

**Phase 2 (semaines 3-4) :**
- Marche 15-20 minutes
- Montée progressive des escaliers

**Phase 3 (semaines 5-8) :**
- Marche 30 minutes
- Programme de rééducation cardiaque avec kiné

⚠️ Arrêtez et appelez votre médecin si vous ressentez : essoufflement important, douleur thoracique, palpitations, malaise.`
  },
  {
    keywords: ['cicatrice', 'plaie', 'wound', 'infection', 'rouge', 'gonflé', 'pus'],
    response: `**Soins de la cicatrice** 🩹

Voici comment prendre soin de votre cicatrice :

**Signes normaux :**
- Légère rougeur, tiraillement, démangeaisons
- Petit hématome ou ecchymose

**Nettoyage :**
- Nettoyez doucement à l'eau tiède et savon doux
- Séchez en tamponnant (ne pas frotter)
- Évitez bains prolongés et piscine pendant 4 semaines

⚠️ **Consultez rapidement** si vous observez :
- Rougeur s'étendant, chaleur excessive
- Écoulement jaune/vert (pus)
- Fièvre > 38.5°C
- Ouverture de la plaie`
  },
  {
    keywords: ['coeur', 'palpitation', 'rythme', 'cardiaque', 'tachycardie', 'bradycardie'],
    response: `**Suivi cardiaque** ❤️

Votre cœur est en phase de guérison après l'intervention :

**Ce qui est normal :**
- Légères variations du rythme cardiaque
- Sensation de battements plus forts qu'avant

**Surveillez ces signes d'alerte :**
- Palpitations rapides (> 100 bpm au repos)
- Palpitations irrégulières persistantes
- Essoufflement au repos
- Syncope ou pré-syncope

📊 Enregistrez votre fréquence cardiaque quotidiennement dans la section **Suivi symptômes**.

🆘 Appelez le **15** immédiatement si vous ressentez une douleur thoracique intense avec essoufflement.`
  },
  {
    keywords: ['vertige', 'vertiges', 'étourdi', 'etourdi', 'tête qui tourne', 'tete qui tourne', 'malaise', 'tourner de l\'œil'],
    response: `**Vertiges et étourdissements** 💫

Après une hospitalisation, des vertiges peuvent venir d'une baisse de tension, de la déshydratation, de la fatigue ou d'un traitement (notamment pour la tension ou le cœur).

**Sur le moment :**
- Asseyez-vous ou allongez-vous immédiatement, ne restez pas debout
- Levez-vous ensuite lentement, en deux temps (assis, puis debout)
- Hydratez-vous et mangez régulièrement

⚠️ **Appelez le 15** si le vertige s'accompagne de douleur thoracique, d'un trouble de la parole ou de la vision, d'une faiblesse d'un côté du corps, d'un malaise avec perte de connaissance, ou de palpitations qui ne passent pas.

📋 Sinon, **signalez ces vertiges à votre médecin traitant** : ils peuvent nécessiter un ajustement de traitement. Ne modifiez jamais vos doses seul.`
  },
  {
    keywords: ['nausée', 'nausee', 'nausées', 'vomir', 'vomissement', 'mal au cœur', 'mal au coeur', 'digestion', 'estomac', 'ventre'],
    response: `**Nausées et troubles digestifs** 🤢

Les nausées après une opération sont fréquentes : effet d'un médicament (antidouleur, antibiotique, traitement cardiaque), reprise alimentaire, ou anxiété.

**Conseils :**
- Repas légers et fractionnés (petites quantités, plus souvent)
- Évitez gras, fritures, plats épicés, café
- Buvez par petites gorgées, fraîches
- Prenez vos médicaments au milieu d'un repas si l'ordonnance le permet

⚠️ **Consultez rapidement** en cas de vomissements répétés (impossible de boire), de sang dans les vomissements, de fièvre, ou de douleur abdominale intense.

📋 Si les nausées ont commencé avec un nouveau médicament, **parlez-en à votre médecin** : n'arrêtez pas le traitement de vous-même.`
  },
  {
    keywords: ['thyroïde', 'thyroide', 'thyroid', 'tsh', 't3', 't4'],
    response: `**La thyroïde** 🦋

La thyroïde est une petite glande située à la base du cou. Elle produit des hormones qui influencent notamment l'énergie, le rythme cardiaque, la température corporelle, le poids et le transit.

- La **TSH** aide à réguler la thyroïde.
- La **T4 libre** et la **T3** sont des hormones thyroïdiennes mesurées par bilan sanguin.
- Une valeur isolée ne suffit pas à poser un diagnostic : elle doit être interprétée avec les unités, les valeurs de référence du laboratoire, les symptômes et le traitement.

️Ne modifiez jamais votre traitement thyroïdien sans l'avis de votre médecin. En cas de douleur thoracique, essoufflement, malaise ou confusion, appelez le 15.`
  },
  {
    keywords: ['anxieux', 'anxiété', 'déprimé', 'triste', 'moral', 'peur', 'stress', 'psychologique'],
    response: `**Soutien psychologique** 🧠

Il est tout à fait normal de ressentir anxiété ou tristesse après une opération cardiaque. Vous n'êtes pas seul :

**Ce que vous pouvez ressentir :**
- Anxiété face à l'avenir
- Peur d'une rechute
- Dépression légère post-opératoire (touche 30% des patients)

**Comment vous aider :**
- Parlez-en à votre médecin sans hésiter
- Votre rendez-vous avec Dr. Anne Petit (psychiatrie) le 25 mars peut vous apporter un soutien
- Rejoignez un groupe de soutien pour cardiaques
- Pratiquez des techniques de relaxation (respiration abdominale)

💪 Votre santé mentale est aussi importante que votre santé physique.`
  },
  {
    keywords: ['urgence', 'appel', 'samu', 'pompiers', 'aide', 'urgences'],
    response: `**Numéros d'urgence** 🆘

En cas d'urgence médicale, n'hésitez pas à appeler :

- 🚨 **15** - SAMU (urgences médicales)
- 🚒 **18** - Pompiers
- 🆘 **112** - Numéro d'urgence européen

**Symptômes nécessitant une intervention immédiate :**
- Douleur thoracique intense
- Difficultés respiratoires soudaines
- Perte de connaissance
- Paralysie d'un côté du corps
- Troubles de la parole

**Contacts médicaux :**
- Dr. Sophie Martin : 01 23 45 67 89
- CHU Paris Nord (urgences cardiologiques) : disponible 24h/24`
  },
  {
    keywords: ['bonjour', 'bonsoir', 'salut', 'hello', 'comment', 'ça va'],
    response: `Bonjour ! Je suis votre assistant IA de suivi post-hospitalisation. 😊

Je suis là pour vous aider dans votre convalescence après votre **pontage coronarien**.

Je peux vous renseigner sur :
- 💊 Vos médicaments et leur prise
- 🏃 La reprise progressive des activités
- 🍽️ L'alimentation adaptée
- 🩹 Les soins de la cicatrice
- ❤️ Le suivi cardiaque
- 📅 Vos rendez-vous médicaux
- 🧠 Le soutien psychologique

Comment puis-je vous aider aujourd'hui ?`
  }
];

// Base de connaissances IA pour médecin
const AI_DOCTOR_KNOWLEDGE_BASE = [
  {
    keywords: ['patient', 'dossier', 'suivi', 'panel'],
    response: `**Suivi de vos patients** 🧑‍⚕️

Depuis votre dashboard médecin, vous pouvez :

- Consulter l'onglet **Mes patients**
- Ouvrir un dossier patient pour voir constantes, traitements et documents
- Envoyer des notifications ciblées
- Créer un rendez-vous pour un patient

💡 Commencez par sélectionner un patient pour afficher sa vue médicale détaillée.`
  },
  {
    keywords: ['notification', 'message', 'alerte'],
    response: `**Communication médecin-patient** 🔔

Vous pouvez interagir directement avec le patient depuis le dashboard :

- **Envoyer notification** pour rappel, consigne ou alerte
- Type recommandé : 
  - \'message\' pour information générale
  - \'alert\' pour information prioritaire

✍️ Rédigez des consignes courtes, claires et actionnables.`
  },
  {
    keywords: ['rendez-vous', 'appointment', 'consultation'],
    response: `**Planification des rendez-vous** 📅

Pour planifier un patient :

1. Ouvrez son dossier
2. Cliquez sur **Ajouter rendez-vous**
3. Renseignez titre, date, heure et lieu

Le rendez-vous sera visible dans son espace patient.`
  },
  {
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir'],
    response: `Bonjour Docteur. 👋

Je suis votre assistant IA clinique dans SuiviPatient.

Je peux vous aider à :
- structurer le suivi patient,
- rédiger des notifications,
- préparer des rappels de consultation,
- standardiser vos messages d'éducation thérapeutique.

Que souhaitez-vous faire ?`
  }
];

function generateAIResponse(userMessage, userRole) {
  const message = userMessage.toLowerCase();

  if (userRole === 'doctor') {
    for (const entry of AI_DOCTOR_KNOWLEDGE_BASE) {
      if (entry.keywords.some(keyword => message.includes(keyword))) {
        return entry.response;
      }
    }

    return `Message reçu Docteur. ✅

Je peux vous assister sur :
- le suivi des dossiers patients,
- la préparation de notifications claires,
- l'organisation des consultations,
- les messages d'éducation post-hospitalisation.

Exemple : "Rédige une notification courte pour rappeler le bilan sanguin de demain."`;
  }

  for (const entry of AI_KNOWLEDGE_BASE) {
    if (entry.keywords.some(keyword => message.includes(keyword))) {
      return entry.response;
    }
  }

  return `Merci pour votre message. Je comprends votre préoccupation concernant votre rétablissement.

Pour des questions spécifiques à votre état de santé, je vous recommande de :

1. **Contacter votre médecin traitant** - Dr. Sophie Martin : 01 23 45 67 89
2. **Utiliser la messagerie** de l'application pour envoyer un message à votre équipe médicale
3. **Consulter les urgences** si vous ressentez des symptômes alarmants (appel 15)

Je peux vous aider sur des sujets comme :
- Vos médicaments, votre alimentation, votre activité physique
- Les soins de cicatrice, la gestion de la fatigue
- Vos rendez-vous médicaux

Reformulez votre question et je ferai de mon mieux pour vous aider ! 😊`;
}

function getProfileName(user) {
  const profile = user?.profile || {};
  return `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.email || 'non renseigné';
}

function formatMedication(medication) {
  return `${medication.name}${medication.dosage ? ` (${medication.dosage})` : ''}${medication.frequency ? `, ${medication.frequency}` : ''}`;
}

function formatAppointment(appointment) {
  const date = appointment.date ? new Date(appointment.date).toLocaleDateString('fr-FR') : 'date non renseignée';
  return `${appointment.title || appointment.type || 'Rendez-vous'} le ${date}${appointment.time ? ` à ${appointment.time}` : ''}${appointment.doctorName ? ` avec ${appointment.doctorName}` : ''}`;
}

async function buildPatientRagContext(patientId) {
  const patient = await User.findByPk(patientId);
  if (!patient) return null;

  const [doctor, medications, appointments, symptoms, thyroidCheckin, appleHealthLogs, documents] = await Promise.all([
    patient.treatingDoctorId ? User.findByPk(patient.treatingDoctorId) : null,
    Medication.findAll({ where: { patientId }, order: [['createdAt', 'DESC']], limit: 20 }),
    Appointment.findAll({ where: { patientId }, order: [['date', 'DESC']], limit: 10 }),
    Symptom.findAll({ where: { patientId }, order: [['date', 'DESC']], limit: 10 }),
    ThyroidCheckin.findOne({ where: { patientId }, order: [['checkedAt', 'DESC']] }),
    AppleHealthMeasurement.findAll({ where: { patientId }, order: [['syncedAt', 'DESC'], ['measuredAt', 'DESC']], limit: 80 }),
    Document.findAll({ where: { patientId }, order: [['uploadDate', 'DESC']], limit: 10 })
  ]);

  return {
    patient: {
      name: getProfileName(patient),
      email: patient.email,
      role: patient.role,
      dateOfBirth: patient.profile?.dateOfBirth || null,
      diagnosis: patient.profile?.diagnosis || null,
      treatingDoctor: patient.profile?.treatingDoctor || null
    },
    doctor: doctor ? {
      name: getProfileName(doctor),
      email: doctor.email,
      speciality: doctor.profile?.speciality || doctor.profile?.specialty || null,
      phone: doctor.profile?.phone || null
    } : null,
    medications: medications.map(formatMedication),
    appointments: appointments.map(formatAppointment),
    symptoms: symptoms.map((symptom) => ({
      date: symptom.date,
      mood: symptom.mood,
      symptoms: symptom.symptoms,
      vitals: symptom.vitals,
      notes: symptom.notes
    })),
    latestThyroidCheckin: thyroidCheckin ? {
      checkedAt: thyroidCheckin.checkedAt,
      category: thyroidCheckin.category,
      riskScore: thyroidCheckin.riskScore,
      reasons: thyroidCheckin.reasons,
      measurements: thyroidCheckin.measurements,
      answers: thyroidCheckin.answers
    } : null,
    appleHealthLogs: appleHealthLogs.map((log) => ({
      syncId: log.syncId,
      measuredAt: log.measuredAt,
      syncedAt: log.syncedAt,
      type: log.type,
      value: log.value,
      unit: log.unit,
      source: log.source
    })),
    documents: documents.map((document) => ({ name: document.name, type: document.type, date: document.date || document.uploadDate }))
  };
}

async function buildDoctorRagContext(doctorId) {
  const doctor = await User.findByPk(doctorId);
  if (!doctor) return null;

  const patients = await User.findAll({
    where: { role: 'patient', treatingDoctorId: doctorId, registrationStatus: 'approved' },
    order: [['updatedAt', 'DESC']],
    limit: 100
  });

  const patientContexts = await Promise.all(patients.map(async (patient) => {
    const [latestSymptom, thyroidCheckin, appleHealthLogs, medications, appointments, alerts] = await Promise.all([
      Symptom.findOne({ where: { patientId: patient.id }, order: [['date', 'DESC']] }),
      ThyroidCheckin.findOne({ where: { patientId: patient.id }, order: [['checkedAt', 'DESC']] }),
      AppleHealthMeasurement.findAll({ where: { patientId: patient.id }, order: [['syncedAt', 'DESC'], ['measuredAt', 'DESC']], limit: 20 }),
      Medication.findAll({ where: { patientId: patient.id }, order: [['createdAt', 'DESC']], limit: 10 }),
      Appointment.findAll({ where: { patientId: patient.id }, order: [['date', 'DESC']], limit: 5 }),
      Notification.findAll({ where: { patientId: patient.id, type: 'alert', read: false }, order: [['timestamp', 'DESC']], limit: 10 })
    ]);

    const profile = patient.profile || {};
    return {
      id: patient.id,
      name: getProfileName(patient),
      email: patient.email,
      diagnosis: profile.diagnosis || null,
      latestSymptom: latestSymptom ? {
        date: latestSymptom.date,
        mood: latestSymptom.mood,
        symptoms: latestSymptom.symptoms,
        vitals: latestSymptom.vitals,
        notes: latestSymptom.notes
      } : null,
      latestThyroidCheckin: thyroidCheckin ? {
        checkedAt: thyroidCheckin.checkedAt,
        category: thyroidCheckin.category,
        riskScore: thyroidCheckin.riskScore,
        reasons: thyroidCheckin.reasons,
        measurements: thyroidCheckin.measurements
      } : null,
      appleHealthLogs: appleHealthLogs.map((log) => ({ type: log.type, value: log.value, unit: log.unit, measuredAt: log.measuredAt, syncedAt: log.syncedAt })),
      medications: medications.map(formatMedication),
      appointments: appointments.map(formatAppointment),
      unreadAlerts: alerts.map((alert) => ({ title: alert.title, message: alert.message, timestamp: alert.timestamp }))
    };
  }));

  return {
    doctor: {
      name: getProfileName(doctor),
      email: doctor.email,
      speciality: doctor.profile?.speciality || doctor.profile?.specialty || null
    },
    patientCount: patientContexts.length,
    patients: patientContexts
  };
}

// Le raccourci deterministe ne repond QUE si le patient demande explicitement
// une donnee de son dossier. Toute question de ressenti / symptome / conseil
// (\u00ab mon traitement me donne des nausees \u00bb) doit partir vers le LLM.
function isPlainRecordLookup(normalized) {
  const wordCount = normalized.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 16) return false;
  if (/(mal |douleur|souffr|nausee|vomi|fievre|fatigue|epuis|inquiet|peur|angoiss|stress|triste|deprim|moral|essouffl|vertige|malaise|saigne|gonfl|demange|conseil|que faire|dois-je|dois je|est-ce normal|est ce normal|est-ce grave|est ce grave|pourquoi|effet secondaire|secondaire|me donne|me fait|ressens|j'ai des|jai des)/.test(normalized)) {
    return false;
  }
  return /(^|\b)(quel|quels|quelle|quelles|quand|ou est|qui est|c'?est quoi|liste|affiche|montre|donne-moi|donne moi|combien|ai-je|ai je)\b/.test(normalized)
    || /\bmes /.test(normalized)
    || normalized.includes('?');
}

function getDirectPersonalAnswer(message, context) {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!isPlainRecordLookup(normalized)) return null;
  if (/(comment je m'appelle|quel est mon nom|qui suis-je)/.test(normalized)) {
    return `Vous êtes **${context.patient.name}**.`;
  }
  if (/(qui est mon medecin|quel est mon medecin|mon medecin traitant|coordonnees.{0,12}medecin|numero.{0,12}(medecin|docteur))/.test(normalized)) {
    if (!context.doctor) return 'Aucun médecin rattaché n’est enregistré dans votre dossier.';
    const doctor = [context.doctor.name, context.doctor.speciality, context.doctor.phone].filter(Boolean).join(' · ');
    return `Votre médecin rattaché est **${doctor}**.`;
  }
  if (/(quels?|liste|mes|mon).{0,20}(medicament|traitement|ordonnance)/.test(normalized)) {
    return context.medications.length
      ? `Vos traitements enregistrés sont :\n\n${context.medications.map((medication) => `- ${medication}`).join('\n')}`
      : 'Aucun médicament n’est enregistré dans votre dossier.';
  }
  if (/(mes rendez-vous|prochain rendez-vous|prochaine consultation)/.test(normalized)) {
    return context.appointments.length
      ? `Voici vos rendez-vous enregistrés :\n\n${context.appointments.slice(0, 5).map((appointment) => `- ${appointment}`).join('\n')}`
      : 'Aucun rendez-vous n’est enregistré dans votre dossier.';
  }
  if (/(mes constantes|ma frequence cardiaque|mon rythme cardiaque|mes donnees apple|apple watch)/.test(normalized)) {
    if (!context.appleHealthLogs.length) return 'Aucune mesure Apple Watch récente n’est enregistrée dans votre dossier.';
    const latestByType = new Map();
    context.appleHealthLogs.forEach((log) => { if (!latestByType.has(log.type)) latestByType.set(log.type, log); });
    return `Voici vos dernières mesures synchronisées :\n\n${Array.from(latestByType.values()).map((log) => `- ${log.type} : ${log.value} ${log.unit} (${new Date(log.measuredAt).toLocaleString('fr-FR')})`).join('\n')}`;
  }
  return null;
}

function getDirectDoctorAnswer(message, context) {
  const normalized = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/(combien|nombre).*(patient|malade)|mes patients|liste.*patient/.test(normalized)) {
    if (!context.patientCount) return 'Aucun patient approuvé n’est actuellement rattaché à votre compte.';
    return `Vous avez **${context.patientCount} patient(s)** rattaché(s) :\n\n${context.patients.map((patient) => `- ${patient.name}${patient.diagnosis ? ` · ${patient.diagnosis}` : ''}`).join('\n')}`;
  }
  if (/(alerte|alertes|urgent|urgence)/.test(normalized)) {
    const alerts = context.patients.flatMap((patient) => patient.unreadAlerts.map((alert) => ({ patient: patient.name, ...alert })));
    return alerts.length
      ? `Voici les alertes non lues :\n\n${alerts.map((alert) => `- **${alert.patient}** : ${alert.title} — ${alert.message}`).join('\n')}`
      : 'Aucune alerte non lue n’est enregistrée pour vos patients.';
  }
  if (/(dernier|derniere).*(checking|thyro|constante|symptome)|etat.*patient/.test(normalized)) {
    return context.patients.length
      ? context.patients.map((patient) => {
        const checkin = patient.latestThyroidCheckin;
        const symptom = patient.latestSymptom;
        return `- **${patient.name}** : ${checkin ? `checking thyroïde ${checkin.category} (${checkin.checkedAt})` : 'pas de checking thyroïde'} ; ${symptom ? `dernier relevé ${symptom.date}` : 'pas de relevé symptôme'}`;
      }).join('\n')
      : 'Aucun patient rattaché.';
  }
  return null;
}

function buildSystemPrompt(userRole, healthContext = '') {
  if (userRole === 'doctor') {
    return `Tu es un assistant clinique pour médecins dans une application de suivi patient post-hospitalisation.
Réponds en français, de manière concise, structurée et actionnable.
Tu ne poses pas de diagnostic définitif.
Si une urgence est suspectée, rappelle d'appeler le 15.
  Propose des étapes concrètes (suivi, communication patient, rendez-vous, coordination).
Voici le contexte RAG issu de la base de données du dossier consulté. Utilise uniquement ces informations pour les questions personnelles et indique quand une donnée est absente :
${healthContext || 'Aucun contexte patient disponible.'}`;
  }

  return `Tu es un assistant de suivi post-hospitalisation pour patient.
Réponds en français, de manière claire, rassurante et pratique.
Tu ne remplaces pas un médecin et tu ne poses pas de diagnostic définitif.
Si des signes d'urgence sont décrits, demande d'appeler immédiatement le 15.
Donne des conseils simples et des prochaines étapes concrètes.
Voici le contexte RAG issu de la base de données du patient. Utilise-le pour personnaliser les réponses, sans inventer de valeur absente et sans poser de diagnostic :
${healthContext || 'Aucun contexte patient disponible.'}`;
}

function mapHistoryToLLMMessages(history) {
  return history
    .slice()
    .reverse()
    .map((item) => ({
      role: item.type === 'user' ? 'user' : 'assistant',
      content: item.message || ''
    }))
    .filter((m) => m.content.trim().length > 0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Combien de temps attendre avant un nouvel essai apres un 429.
function parseRetryDelayMs(response, bodyText) {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, 9000);
  const match = /try again in ([\d.]+)s/i.exec(bodyText || '');
  if (match) return Math.min(Math.ceil(parseFloat(match[1]) * 1000) + 250, 9000);
  return 1500;
}

async function callGroqOnce({ userRole, history, healthContext }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.35,
        max_tokens: 550,
        messages: [
          { role: 'system', content: buildSystemPrompt(userRole, healthContext) },
          ...mapHistoryToLLMMessages(history)
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText.slice(0, 300));
      const retryable = response.status === 429 || response.status >= 500;
      return { answer: null, retryable, retryDelayMs: parseRetryDelayMs(response, errText) };
    }

    const data = await response.json();
    const choice = data?.choices?.[0]?.message;
    // Certains modèles "reasoning" renvoient content vide et tout dans reasoning
    const answer = choice?.content || choice?.reasoning;
    if (!answer || !answer.trim()) {
      console.error('Groq API: réponse vide', JSON.stringify(data?.choices?.[0] || data).slice(0, 300));
      return { answer: null, retryable: false };
    }
    return { answer: answer.trim(), retryable: false };
  } catch (err) {
    console.error('Groq request failed:', err.message);
    return { answer: null, retryable: err.name !== 'AbortError', retryDelayMs: 1200 };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateGroqResponse({ userRole, history, healthContext }) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  // Le tier gratuit Groq a une limite basse de tokens/minute : on retente
  // 2 fois sur 429 / erreur transitoire avant de basculer sur le repli.
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await callGroqOnce({ userRole, history, healthContext });
    if (result.answer) return result.answer;
    if (!result.retryable || attempt === maxAttempts) return null;
    await sleep(result.retryDelayMs || 1500);
  }
  return null;
}

// GET /api/chat
router.get('/', authenticateToken, async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { patientId: req.user.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/chat/send
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }

    // Message utilisateur
    const userMessage = await ChatMessage.create({
      id: `msg-${uuidv4()}`,
      patientId: req.user.id,
      type: 'user',
      message: content.trim(),
      timestamp: new Date()
    });

    // Historique récent pour contextualiser la réponse LLM
    const history = await ChatMessage.findAll({
      where: { patientId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 12
    });

    const ragContext = req.user.role === 'doctor'
      ? await buildDoctorRagContext(req.user.id)
      : await buildPatientRagContext(req.user.id);
    const directAnswer = ragContext
      ? (req.user.role === 'doctor'
        ? getDirectDoctorAnswer(content, ragContext)
        : getDirectPersonalAnswer(content, ragContext))
      : null;
    const llmText = await generateGroqResponse({
      userRole: req.user.role,
      history,
      healthContext: JSON.stringify(ragContext)
    });

    // Réponse IA
    const aiResponse = await ChatMessage.create({
      id: `msg-${uuidv4()}`,
      patientId: req.user.id,
      type: 'ai',
      message: directAnswer || llmText || generateAIResponse(content, req.user.role),
      timestamp: new Date()
    });

    res.json({ userMessage, aiResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/chat/clear
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await ChatMessage.destroy({
      where: { patientId: req.user.id }
    });
    res.json({ message: 'Historique effacé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

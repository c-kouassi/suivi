/**
 * seedDemo.js — Jeu de données fictif pour une démo / présentation.
 * Cabinet d'endocrinologie spécialisé dans les troubles thyroïdiens.
 *
 *   ⚠️  RECRÉE TOUTES LES TABLES (sync force:true) — la base est vidée.
 *
 * Lancement :  npm run seed
 *
 * Comptes créés (mot de passe commun : demo1234) :
 *   Médecin  : claire.lefevre@endoclinic.fr
 *   Patients : julie.moreau@demo.fr, marc.petit@demo.fr, awa.diallo@demo.fr,
 *              thomas.bernard@demo.fr, helene.roux@demo.fr
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const sequelize = require('./config/database');
const User = require('./models/User');
const Medication = require('./models/Medication');
const Appointment = require('./models/Appointment');
const Symptom = require('./models/Symptom');
const ThyroidCheckin = require('./models/ThyroidCheckin');
const AppleHealthMeasurement = require('./models/AppleHealthMeasurement');
const Document = require('./models/Document');
const Notification = require('./models/Notification');
const ChatMessage = require('./models/ChatMessage');
const Message = require('./models/Message');

const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads', 'documents');
const DOCTOR_ID = 'doctor-claire';
const DOCTOR_NAME = 'Dr. Claire Lefèvre';
const AppleHealthMeasurementQueue = [];

const now = new Date();
function at(daysFromNow, h = 9, m = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, m, 0, 0);
  return d;
}
const CATEGORY_LABELS = { normal: 'Normal', surveillance: 'Surveillance', important: 'Important', urgent: 'Urgent' };

// --- Générateur de PDF minimal (1 page, Helvetica) -------------------------
function buildPdf(title, lines) {
  const strip = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, ' ');
  const body = [title, '', ...lines]
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${770 - i * 20} Td (${strip(l)}) Tj ET`)
    .join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

async function makeDocument({ patientId, name, type, description, uploadedByRole, uploadedById, daysAgo, lines }) {
  const storedName = `${uuid()}.pdf`;
  const buf = buildPdf(name, lines || ['Document de démonstration.', `Patient : ${patientId}`, `Généré le ${now.toLocaleDateString('fr-FR')}`]);
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buf);
  return Document.create({
    id: `doc-${uuid()}`,
    patientId,
    name,
    type,
    category: null,
    description: description || null,
    originalName: `${name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()}.pdf`,
    storedName,
    mimeType: 'application/pdf',
    size: buf.length,
    uploadedById,
    uploadedByRole,
    visibility: 'shared',
    uploadDate: at(-daysAgo, 10, 0),
    fileUrl: null
  });
}

// --- Données patients -----------------------------------------------------
const PATIENTS = [
  {
    id: 'patient-julie',
    email: 'julie.moreau@demo.fr',
    profile: {
      firstName: 'Julie', lastName: 'Moreau', avatar: 'JM',
      dateOfBirth: '1990-06-12', phone: '06 11 22 33 44',
      address: '8 rue Victor Hugo, 69003 Lyon',
      diagnosis: 'Thyroïdite de Hashimoto — hypothyroïdie substituée',
      treatingDoctor: DOCTOR_NAME, hospitalStay: null, hospitalDischargeDate: null
    },
    medications: [
      { name: 'Levothyrox', dosage: '75 µg', frequency: '1 fois par jour', times: ['07:00'],
        indication: 'Hypothyroïdie auto-immune (Hashimoto)', instructions: 'À jeun, 30 min avant le petit-déjeuner, à distance du café, du calcium et du fer.', stock: 58, color: '#6C5CE7' }
    ],
    appointments: [
      { title: 'Bilan initial thyroïdien', date: at(-120, 9, 0), time: '09:00', location: 'EndoClinic Lyon', type: 'consultation', status: 'completed' },
      { title: 'Contrôle TSH', date: at(21, 10, 30), time: '10:30', location: 'EndoClinic Lyon', type: 'consultation', status: 'upcoming' },
      { title: 'Échographie thyroïdienne de suivi', date: at(46, 14, 0), time: '14:00', location: 'Centre d\'imagerie Part-Dieu', type: 'imagerie', status: 'upcoming' }
    ],
    symptoms: [
      { d: -35, mood: '😣', s: [{ name: 'Fatigue', severity: 4 }, { name: 'Frilosité', severity: 3 }], v: { heartRate: 66, bloodPressure: '112/72', temperature: 36.4, oxygenSaturation: 98, weight: 62 }, notes: 'Réveils difficiles, besoin de sieste l\'après-midi.' },
      { d: -21, mood: '😐', s: [{ name: 'Fatigue', severity: 3 }, { name: 'Peau sèche', severity: 2 }], v: { heartRate: 68, bloodPressure: '115/74', temperature: 36.6, oxygenSaturation: 98, weight: 61.8 }, notes: 'Un peu plus d\'énergie depuis l\'ajustement de dose.' },
      { d: -10, mood: '🙂', s: [{ name: 'Fatigue', severity: 2 }], v: { heartRate: 72, bloodPressure: '118/76', temperature: 36.7, oxygenSaturation: 99, weight: 61.5 }, notes: 'Reprise du sport 2x/semaine.' },
      { d: -3, mood: '😊', s: [], v: { heartRate: 71, bloodPressure: '117/75', temperature: 36.8, oxygenSaturation: 99, weight: 61.4 }, notes: 'Très bonne semaine, plus de coups de barre.' }
    ],
    checkins: [
      { d: -30, answers: { symptomSeverity: 3 }, measurements: { tsh: 5.9, freeT4: 0.9, heartRate: 66, weight: 62 }, category: 'surveillance', riskScore: 30, reasons: ['TSH à surveiller (5.9 mUI/L).', 'Symptômes modérés (3/5).'], read: true },
      { d: -10, answers: { symptomSeverity: 2 }, measurements: { tsh: 3.1, freeT4: 1.2, heartRate: 72, weight: 61.5 }, category: 'normal', riskScore: 0, reasons: ['Aucun indicateur nécessitant une alerte automatique.'], read: true }
    ],
    watch: { restHR: [60, 62, 61, 59, 60], hr: [72, 78, 68, 74, 70], mass: [62, 61.8, 61.6, 61.5, 61.4], steps: [7200, 8400, 6100, 9300, 8800], o2: [98, 99, 98, 99, 98] },
    documents: [
      { name: 'Bilan thyroïdien - laboratoire Cerballiance', type: 'exam', by: 'patient', daysAgo: 12, description: 'TSH 3.1 / T4L 1.2 / anticorps anti-TPO positifs', lines: ['TSH : 3.1 mUI/L (norme 0.4-4.0)', 'T4 libre : 1.2 ng/dL', 'Anticorps anti-TPO : 320 UI/mL (positif)', 'Conclusion : hypothyroidie auto-immune equilibree.'] },
      { name: 'Compte-rendu échographie thyroïdienne', type: 'report', by: 'doctor', daysAgo: 8, description: 'Glande hétérogène, pas de nodule suspect', lines: ['Thyroide de volume normal, echostructure heterogene.', 'Aspect compatible avec une thyroidite de Hashimoto.', 'Absence de nodule suspect. Pas de controle rapproche necessaire.'] }
    ],
    chat: [
      ['user', 'Je peux prendre mon Levothyrox avec mon café du matin ?'],
      ['ai', 'Il vaut mieux éviter : le café peut réduire l\'absorption du Levothyrox. Prenez le comprimé avec un grand verre d\'eau, puis attendez au moins 30 minutes avant le café ou le petit-déjeuner. Gardez toujours le même rituel d\'un jour à l\'autre.'],
      ['user', 'J\'ai oublié ma prise hier matin, que faire ?'],
      ['ai', 'Un oubli occasionnel n\'est pas grave. Si vous vous en rendez compte dans la matinée, prenez-le à jeun ; sinon, reprenez normalement le lendemain sans doubler la dose. Signalez à votre médecin si les oublis se répètent.']
    ],
    messages: [
      { from: 'patient', d: -6, body: 'Bonjour Docteur, ma fatigue s\'est bien améliorée ce mois-ci, merci !' },
      { from: 'doctor', d: -6, body: 'Très bonne nouvelle Julie. On confirmera l\'équilibre au bilan de contrôle.' },
      { from: 'patient', d: -1, body: 'Faut-il refaire la prise de sang avant le rendez-vous du mois prochain ?', unread: true }
    ],
    notifications: [
      { type: 'appointment', title: 'Rappel : contrôle TSH', message: `Rendez-vous le ${at(21).toLocaleDateString('fr-FR')} à 10h30 à EndoClinic Lyon.`, read: false, d: -1 },
      { type: 'medication', title: 'Pensez à commander votre Levothyrox', message: 'Stock estimé : moins de 2 semaines.', read: true, d: -4 }
    ]
  },

  {
    id: 'patient-marc',
    email: 'marc.petit@demo.fr',
    profile: {
      firstName: 'Marc', lastName: 'Petit', avatar: 'MP',
      dateOfBirth: '1972-02-28', phone: '06 55 66 77 88',
      address: '23 avenue des Ternes, 75017 Paris',
      diagnosis: 'Maladie de Basedow — hyperthyroïdie',
      treatingDoctor: DOCTOR_NAME, hospitalStay: null, hospitalDischargeDate: null
    },
    medications: [
      { name: 'Néo-Mercazole (carbimazole)', dosage: '20 mg', frequency: '1 fois par jour', times: ['08:00'],
        indication: 'Maladie de Basedow', instructions: 'Consulter en urgence en cas de fièvre ou d\'angine (risque d\'agranulocytose). NFS de contrôle régulière.', stock: 40, color: '#E17055' },
      { name: 'Propranolol', dosage: '40 mg', frequency: '2 fois par jour', times: ['08:00', '20:00'],
        indication: 'Contrôle des palpitations et des tremblements', instructions: 'Ne pas arrêter brutalement.', stock: 50, color: '#0984E3' }
    ],
    appointments: [
      { title: 'Consultation - découverte hyperthyroïdie', date: at(-60, 11, 0), time: '11:00', location: 'EndoClinic Paris', type: 'consultation', status: 'completed' },
      { title: 'Contrôle T4L + NFS (surveillance traitement)', date: at(7, 8, 30), time: '08:30', location: 'EndoClinic Paris', type: 'consultation', status: 'upcoming' },
      { title: 'Réévaluation thérapeutique', date: at(31, 9, 30), time: '09:30', location: 'EndoClinic Paris', type: 'consultation', status: 'upcoming' }
    ],
    symptoms: [
      { d: -28, mood: '😰', s: [{ name: 'Palpitations', severity: 4 }, { name: 'Tremblements', severity: 3 }, { name: 'Bouffées de chaleur', severity: 4 }], v: { heartRate: 104, bloodPressure: '138/82', temperature: 37.2, oxygenSaturation: 98, weight: 78 }, notes: 'Nervosité importante, perte de poids malgré bon appétit.' },
      { d: -18, mood: '😣', s: [{ name: 'Palpitations', severity: 4 }, { name: 'Insomnie', severity: 3 }], v: { heartRate: 112, bloodPressure: '142/86', temperature: 37.1, oxygenSaturation: 98, weight: 76.5 }, notes: 'Réveils nocturnes, cœur qui s\'emballe.' },
      { d: -8, mood: '😐', s: [{ name: 'Palpitations', severity: 3 }, { name: 'Tremblements', severity: 2 }], v: { heartRate: 98, bloodPressure: '132/80', temperature: 36.9, oxygenSaturation: 99, weight: 75 }, notes: 'Un peu mieux depuis l\'ajout du Propranolol.' },
      { d: -2, mood: '😐', s: [{ name: 'Palpitations', severity: 3 }], v: { heartRate: 105, bloodPressure: '135/82', temperature: 37, oxygenSaturation: 98, weight: 74 }, notes: 'Toujours 100-105 au repos le matin.' }
    ],
    checkins: [
      { d: -20, answers: { severePalpitations: true, symptomSeverity: 4 }, measurements: { tsh: 0.01, freeT4: 2.4, freeT3: 6.8, heartRate: 118, temperature: 37.3, weight: 76.5 }, category: 'important', riskScore: 95, reasons: ['Palpitations importantes ou persistantes.', 'Fréquence cardiaque hors zone de sécurité déclarée (118 bpm).', 'Intensité des symptômes évaluée à 4/5.', 'TSH très éloignée du repère habituel (0.01 mUI/L).', 'T4 libre hors du repère indicatif (2.4).'], read: true },
      { d: -4, answers: { severePalpitations: true, symptomSeverity: 3 }, measurements: { tsh: 0.02, freeT4: 1.9, heartRate: 108, temperature: 37, weight: 74 }, category: 'important', riskScore: 75, reasons: ['Palpitations importantes ou persistantes.', 'Fréquence cardiaque hors zone de sécurité déclarée (108 bpm).', 'TSH très éloignée du repère habituel (0.02 mUI/L).'], read: false }
    ],
    watch: { restHR: [82, 85, 80, 88, 84], hr: [98, 112, 105, 118, 101], mass: [78, 76.8, 75.5, 74.6, 74], steps: [5400, 6200, 4800, 7100, 6600], o2: [98, 98, 99, 98, 98] },
    documents: [
      { name: 'Bilan hyperthyroïdie - TSH effondrée', type: 'exam', by: 'patient', daysAgo: 22, description: 'TSH < 0.01, T4L 2.4, anticorps anti-récepteur TSH positifs', lines: ['TSH : < 0.01 mUI/L', 'T4 libre : 2.4 ng/dL (elevee)', 'T3 libre : 6.8 pg/mL (elevee)', 'Anticorps anti-recepteurs TSH (TRAK) : positifs -> maladie de Basedow.'] },
      { name: 'Ordonnance Néo-Mercazole + NFS de contrôle', type: 'prescription', by: 'doctor', daysAgo: 5, description: 'Carbimazole 20 mg/j + hémogramme toutes les 2 semaines', lines: ['Neo-Mercazole 20 mg : 1 comprime le matin.', 'Propranolol 40 mg : matin et soir.', 'NFS (hemogramme) toutes les 2 semaines pendant 2 mois.', 'Consulter en urgence si fievre ou angine.'] }
    ],
    chat: [
      ['user', 'J\'ai des palpitations le soir, c\'est normal avec mon traitement ?'],
      ['ai', 'Sous traitement de la maladie de Basedow, les palpitations diminuent progressivement mais peuvent persister quelques semaines, le temps que les hormones thyroïdiennes se normalisent. Le Propranolol aide à les contrôler. ⚠️ Si vous ressentez une douleur dans la poitrine, un essoufflement au repos ou un malaise, appelez le 15. Signalez à votre médecin toute aggravation.'],
      ['user', 'Je transpire beaucoup et je supporte mal la chaleur.'],
      ['ai', 'C\'est typique de l\'hyperthyroïdie : le métabolisme est accéléré. Cela s\'améliore avec le traitement. En attendant : vêtements légers, hydratation régulière, pièces fraîches, on évite les efforts intenses aux heures chaudes. Parlez-en à votre médecin au prochain contrôle.']
    ],
    messages: [
      { from: 'patient', d: -3, body: 'Docteur, mon cœur bat encore très vite malgré le traitement.' },
      { from: 'doctor', d: -3, body: 'Marc, passez le Propranolol à 40 mg matin ET soir comme convenu, et on se voit vendredi pour la NFS et la T4L. En cas de douleur thoracique ou de malaise, appelez le 15.' },
      { from: 'patient', d: -2, body: 'D\'accord, merci.' },
      { from: 'patient', d: 0, body: 'Toujours 105 au repos ce matin, je voulais vous prévenir.', unread: true }
    ],
    notifications: [
      { type: 'alert', title: 'Checking thyroïde : Important', message: 'Un checking patient nécessite votre attention. Score 75. Palpitations importantes ou persistantes. Fréquence cardiaque hors zone de sécurité déclarée (108 bpm).', read: false, d: -4 },
      { type: 'appointment', title: 'Rappel : contrôle T4L + NFS', message: `Rendez-vous le ${at(7).toLocaleDateString('fr-FR')} à 08h30.`, read: false, d: -1 },
      { type: 'medication', title: 'NFS de contrôle à réaliser', message: 'Hémogramme prévu cette semaine (surveillance carbimazole).', read: false, d: -2 }
    ]
  },

  {
    id: 'patient-awa',
    email: 'awa.diallo@demo.fr',
    profile: {
      firstName: 'Awa', lastName: 'Diallo', avatar: 'AD',
      dateOfBirth: '1983-11-05', phone: '06 44 33 22 11',
      address: '5 place du Marché, 33000 Bordeaux',
      diagnosis: 'Thyroïdectomie totale (carcinome papillaire) — substitution',
      treatingDoctor: DOCTOR_NAME, hospitalStay: 'CHU Bordeaux — Chirurgie endocrinienne', hospitalDischargeDate: at(-88).toISOString().slice(0, 10)
    },
    medications: [
      { name: 'Levothyrox', dosage: '125 µg', frequency: '1 fois par jour', times: ['07:00'],
        indication: 'Substitution hormonale après thyroïdectomie totale', instructions: 'À jeun. Dose freinatrice : ne pas modifier sans avis.', stock: 70, color: '#00B894' },
      { name: 'Cacit Vitamine D3', dosage: '500 mg / 1000 UI', frequency: '1 fois par jour', times: ['12:00'],
        indication: 'Prévention de l\'hypocalcémie post-opératoire', instructions: 'À distance du Levothyrox (au moins 4 h).', stock: 45, color: '#FDCB6E' }
    ],
    appointments: [
      { title: 'Consultation post-opératoire', date: at(-88, 10, 0), time: '10:00', location: 'EndoClinic Bordeaux', type: 'consultation', status: 'completed' },
      { title: 'Contrôle substitution + calcémie', date: at(-30, 9, 0), time: '09:00', location: 'EndoClinic Bordeaux', type: 'consultation', status: 'completed' },
      { title: 'Scintigraphie de contrôle + thyroglobuline', date: at(61, 8, 0), time: '08:00', location: 'Médecine nucléaire — CHU Bordeaux', type: 'imagerie', status: 'upcoming' }
    ],
    symptoms: [
      { d: -40, mood: '😐', s: [{ name: 'Fourmillements des doigts', severity: 2 }, { name: 'Fatigue', severity: 2 }], v: { heartRate: 74, bloodPressure: '120/78', temperature: 36.7, oxygenSaturation: 99, weight: 68 }, notes: 'Cicatrice cervicale propre. Quelques paresthésies le soir.' },
      { d: -18, mood: '🙂', s: [{ name: 'Fourmillements des doigts', severity: 1 }], v: { heartRate: 72, bloodPressure: '118/76', temperature: 36.8, oxygenSaturation: 99, weight: 68.2 }, notes: 'Paresthésies plus rares depuis l\'ajustement du calcium.' },
      { d: -5, mood: '😊', s: [], v: { heartRate: 70, bloodPressure: '117/75', temperature: 36.7, oxygenSaturation: 99, weight: 68 }, notes: 'Bonne forme, reprise complète du travail.' }
    ],
    checkins: [
      { d: -25, answers: { symptomSeverity: 2 }, measurements: { tsh: 0.3, freeT4: 1.6, heartRate: 72, weight: 68 }, category: 'normal', riskScore: 0, reasons: ['TSH volontairement freinée dans le cadre du suivi oncologique.'], read: true },
      { d: -2, answers: { symptomSeverity: 1 }, measurements: { tsh: 0.25, freeT4: 1.7, heartRate: 70, weight: 68 }, category: 'normal', riskScore: 0, reasons: ['Aucun indicateur nécessitant une alerte automatique.'], read: true }
    ],
    watch: { restHR: [62, 64, 61, 63, 62], hr: [70, 76, 68, 74, 72], mass: [68, 68.2, 68.1, 68, 68], steps: [9200, 10400, 8100, 11300, 9800], o2: [99, 99, 98, 99, 99] },
    documents: [
      { name: 'Compte-rendu opératoire - thyroïdectomie totale', type: 'surgery', by: 'doctor', daysAgo: 88, description: 'Exérèse complète, parathyroïdes préservées', lines: ['Thyroidectomie totale pour carcinome papillaire.', 'Les 4 glandes parathyroides ont ete identifiees et preservees.', 'Suites simples. Calcemie post-op a surveiller.'] },
      { name: 'Protocole de surveillance oncologique', type: 'report', by: 'doctor', daysAgo: 30, description: 'Thyroglobuline + échographie cervicale à 6 mois', lines: ['Dosage thyroglobuline + anticorps anti-Tg tous les 6 mois.', 'Echographie cervicale annuelle.', 'TSH cible : 0.1 - 0.5 mUI/L (dose freinatrice).'] },
      { name: 'Résultat thyroglobuline', type: 'exam', by: 'patient', daysAgo: 6, description: 'Tg indétectable — excellent', lines: ['Thyroglobuline : < 0.1 ng/mL (indetectable).', 'Anticorps anti-thyroglobuline : negatifs.', 'Interpretation : absence de residu / recidive decelable.'] }
    ],
    chat: [
      ['user', 'C\'est quoi la thyroglobuline ?'],
      ['ai', 'La thyroglobuline (Tg) est une protéine fabriquée uniquement par les cellules thyroïdiennes. Après une thyroïdectomie totale pour cancer, elle sert de marqueur de suivi : si elle reste indétectable, c\'est rassurant. Elle est toujours interprétée avec les anticorps anti-thyroglobuline et l\'imagerie. Votre médecin la commente à chaque bilan.'],
      ['user', 'Je peux prendre le calcium en même temps que le Levothyrox ?'],
      ['ai', 'Non : le calcium diminue l\'absorption du Levothyrox. Prenez le Levothyrox à jeun le matin, et le calcium plutôt le midi ou le soir, en respectant au moins 4 heures d\'écart.']
    ],
    messages: [
      { from: 'patient', d: -9, body: 'Bonjour, mes fourmillements aux doigts sont revenus 2 fois cette semaine.' },
      { from: 'doctor', d: -8, body: 'Awa, prenez un comprimé de calcium supplémentaire si cela se reproduit, et on contrôlera la calcémie au prochain bilan. Rien d\'inquiétant si cela reste bref.' },
      { from: 'patient', d: -8, body: 'Parfait, merci beaucoup Docteur.' }
    ],
    notifications: [
      { type: 'appointment', title: 'Rappel : scintigraphie de contrôle', message: `Examen le ${at(61).toLocaleDateString('fr-FR')} en médecine nucléaire.`, read: true, d: -3 },
      { type: 'message', title: 'Réponse du Dr. Claire Lefèvre', message: 'Votre médecin a répondu à votre message.', read: true, d: -8 }
    ]
  },

  {
    id: 'patient-thomas',
    email: 'thomas.bernard@demo.fr',
    profile: {
      firstName: 'Thomas', lastName: 'Bernard', avatar: 'TB',
      dateOfBirth: '1996-09-19', phone: '06 98 76 54 32',
      address: '14 rue de la Gare, 44000 Nantes',
      diagnosis: 'Nodule thyroïdien isolé — surveillance (euthyroïdie)',
      treatingDoctor: DOCTOR_NAME, hospitalStay: null, hospitalDischargeDate: null
    },
    medications: [],
    appointments: [
      { title: 'Découverte nodule + cytoponction', date: at(-40, 15, 0), time: '15:00', location: 'EndoClinic Nantes', type: 'geste', status: 'completed' },
      { title: 'Échographie de contrôle à 3 mois', date: at(92, 11, 0), time: '11:00', location: 'Cabinet de radiologie Cathédrale', type: 'imagerie', status: 'upcoming' }
    ],
    symptoms: [
      { d: -20, mood: '😰', s: [{ name: 'Gêne à la déglutition', severity: 2 }, { name: 'Anxiété', severity: 3 }], v: { heartRate: 80, bloodPressure: '126/80', temperature: 36.8, oxygenSaturation: 99, weight: 79 }, notes: 'Stress lié à l\'attente des résultats de la ponction.' },
      { d: -6, mood: '😐', s: [{ name: 'Gêne à la déglutition', severity: 1 }], v: { heartRate: 74, bloodPressure: '122/78', temperature: 36.7, oxygenSaturation: 99, weight: 79 }, notes: 'Soulagé après l\'annonce du résultat bénin.' }
    ],
    checkins: [
      { d: -15, answers: { symptomSeverity: 3 }, measurements: { tsh: 2.2, freeT4: 1.3, heartRate: 80, weight: 79 }, category: 'surveillance', riskScore: 15, reasons: ['Symptômes modérés (3/5).'], read: false },
      { d: -1, answers: { symptomSeverity: 1 }, measurements: { tsh: 2.1, freeT4: 1.3, heartRate: 72, weight: 79 }, category: 'normal', riskScore: 0, reasons: ['Aucun indicateur nécessitant une alerte automatique.'], read: true }
    ],
    watch: null,
    documents: [
      { name: 'Compte-rendu cytoponction (Bethesda II - bénin)', type: 'report', by: 'doctor', daysAgo: 12, description: 'Cytologie bénigne, surveillance simple', lines: ['Cytoponction d\'un nodule du lobe droit (18 mm).', 'Resultat : Bethesda II - lesion benigne (nodule colloide).', 'Conduite : surveillance echographique a 3 mois puis annuelle.'] },
      { name: 'Échographie thyroïdienne initiale', type: 'exam', by: 'patient', daysAgo: 38, description: 'Nodule lobe droit 18 mm, EU-TIRADS 3', lines: ['Nodule tissulaire du lobe droit : 18 x 12 x 14 mm.', 'Contours reguliers, pas de microcalcification. EU-TIRADS 3.', 'Reste du parenchyme homogene. Pas d\'adenopathie.'] }
    ],
    chat: [
      ['user', 'Un nodule thyroïdien c\'est grave ?'],
      ['ai', 'Dans la grande majorité des cas, non : plus de 90 % des nodules thyroïdiens sont bénins. La démarche est standard : échographie pour classer le nodule, et cytoponction si besoin. Un résultat "Bethesda II" est bénin et justifie une simple surveillance. Continuez le suivi proposé par votre médecin.'],
      ['user', 'Bethesda 2 ça veut dire quoi exactement ?'],
      ['ai', 'La classification de Bethesda note le résultat d\'une cytoponction de I à VI. **Bethesda II = bénin** : le risque de cancer est très faible (0 à 3 %). On ne réopère pas, on surveille par échographie. Votre médecin fixe le rythme des contrôles.']
    ],
    messages: [
      { from: 'patient', d: -13, body: 'Bonjour Docteur, les résultats de la cytoponction sont-ils rassurants ?' },
      { from: 'doctor', d: -12, body: 'Oui Thomas, Bethesda II = bénin. On surveille par échographie dans 3 mois, il n\'y a rien d\'inquiétant.' },
      { from: 'patient', d: -12, body: 'Merci beaucoup, ça me rassure énormément.' },
      { from: 'patient', d: -2, body: 'Dois-je m\'inquiéter de la petite gêne quand j\'avale ?', unread: true }
    ],
    notifications: [
      { type: 'appointment', title: 'Rappel : échographie de contrôle', message: `Examen le ${at(92).toLocaleDateString('fr-FR')} à 11h00.`, read: false, d: -2 },
      { type: 'message', title: 'Réponse du Dr. Claire Lefèvre', message: 'Votre médecin a répondu à votre message.', read: true, d: -12 }
    ]
  },

  {
    id: 'patient-helene',
    email: 'helene.roux@demo.fr',
    profile: {
      firstName: 'Hélène', lastName: 'Roux', avatar: 'HR',
      dateOfBirth: '1964-04-22', phone: '06 21 43 65 87',
      address: '3 impasse des Roses, 31000 Toulouse',
      diagnosis: 'Hypothyroïdie fruste (TSH 6.8) — initiation du traitement',
      treatingDoctor: DOCTOR_NAME, hospitalStay: null, hospitalDischargeDate: null
    },
    medications: [
      { name: 'Levothyrox', dosage: '25 µg', frequency: '1 fois par jour', times: ['07:00'],
        indication: 'Hypothyroïdie fruste symptomatique — initiation', instructions: 'À jeun le matin. Contrôle de la TSH dans 6 à 8 semaines avant d\'ajuster la dose.', stock: 84, color: '#6C5CE7' }
    ],
    appointments: [
      { title: 'Consultation - initiation Levothyrox', date: at(-20, 16, 0), time: '16:00', location: 'EndoClinic Toulouse', type: 'consultation', status: 'completed' },
      { title: 'Contrôle TSH à 6-8 semaines', date: at(42, 9, 30), time: '09:30', location: 'EndoClinic Toulouse', type: 'consultation', status: 'upcoming' }
    ],
    symptoms: [
      { d: -19, mood: '😴', s: [{ name: 'Fatigue', severity: 4 }, { name: 'Frilosité', severity: 3 }, { name: 'Constipation', severity: 3 }], v: { heartRate: 58, bloodPressure: '128/80', temperature: 36.2, oxygenSaturation: 98, weight: 71 }, notes: 'Fatigue matinale majeure, peau sèche, coup de froid permanent.' },
      { d: -10, mood: '😴', s: [{ name: 'Fatigue', severity: 3 }, { name: 'Frilosité', severity: 3 }], v: { heartRate: 60, bloodPressure: '126/78', temperature: 36.3, oxygenSaturation: 98, weight: 71.5 }, notes: 'Prise de 500 g. Pas encore de changement ressenti.' },
      { d: -3, mood: '😐', s: [{ name: 'Fatigue', severity: 3 }], v: { heartRate: 62, bloodPressure: '124/78', temperature: 36.4, oxygenSaturation: 98, weight: 72 }, notes: 'Peut-être un tout petit peu moins fatiguée l\'après-midi.' }
    ],
    checkins: [
      { d: -18, answers: { symptomSeverity: 3 }, measurements: { tsh: 6.8, freeT4: 0.8, heartRate: 58, temperature: 36.2, weight: 71 }, category: 'surveillance', riskScore: 30, reasons: ['TSH à surveiller (6.8 mUI/L).', 'Symptômes modérés (3/5).'], read: true },
      { d: -3, answers: { symptomSeverity: 3 }, measurements: { tsh: 5.4, freeT4: 0.9, heartRate: 62, temperature: 36.4, weight: 72 }, category: 'surveillance', riskScore: 15, reasons: ['TSH à surveiller (5.4 mUI/L).'], read: false }
    ],
    watch: null,
    documents: [
      { name: 'Bilan sanguin - TSH 6.8', type: 'exam', by: 'patient', daysAgo: 24, description: 'TSH élevée, T4L basse-normale', lines: ['TSH : 6.8 mUI/L (norme 0.4-4.0)', 'T4 libre : 0.8 ng/dL (limite basse)', 'Cholesterol total legerement eleve.', 'Conclusion : hypothyroidie fruste.'] },
      { name: 'Ordonnance Levothyrox 25 µg', type: 'prescription', by: 'doctor', daysAgo: 20, description: 'Initiation faible dose, contrôle à 6-8 semaines', lines: ['Levothyrox 25 microgrammes : 1 comprime le matin a jeun.', 'Controle TSH dans 6 a 8 semaines.', 'Ne pas augmenter la dose sans avis.'] }
    ],
    chat: [
      ['user', 'Combien de temps avant que le Levothyrox fasse effet ?'],
      ['ai', 'L\'amélioration est progressive : les premiers effets se ressentent souvent après 2 à 3 semaines, mais il faut 6 à 8 semaines pour juger de la dose sur une prise de sang (dosage de la TSH). La dose est ensuite ajustée par paliers. Un peu de patience est normale au début.'],
      ['user', 'Je suis vraiment très fatiguée le matin, c\'est décourageant.'],
      ['ai', 'C\'est un symptôme classique de l\'hypothyroïdie, et il met du temps à céder même une fois le traitement commencé. Gardez une prise très régulière du comprimé à jeun, respectez votre sommeil, et notez l\'évolution semaine par semaine dans le suivi des symptômes : ce sera utile à votre médecin pour ajuster la dose au prochain bilan.']
    ],
    messages: [
      { from: 'patient', d: -12, body: 'Bonjour, après 15 jours de traitement je ne vois pas encore de différence, est-ce normal ?' },
      { from: 'doctor', d: -11, body: 'Oui Hélène, c\'est tout à fait normal. Comptez 4 à 6 semaines, et on ajustera la dose selon la TSH de contrôle.' },
      { from: 'patient', d: -11, body: 'D\'accord, merci pour votre patience.', unread: true }
    ],
    notifications: [
      { type: 'medication', title: 'Rappel de prise : Levothyrox', message: 'Pensez à prendre votre comprimé à jeun ce matin.', read: true, d: 0 },
      { type: 'appointment', title: 'Rappel : contrôle TSH', message: `Rendez-vous le ${at(42).toLocaleDateString('fr-FR')} à 09h30.`, read: false, d: -1 }
    ]
  }
];

async function seed() {
  console.log('🔄 Recréation du schéma (force:true)…');
  await sequelize.sync({ force: true });

  // Nettoyage du dossier d'upload
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const f of fs.readdirSync(UPLOAD_DIR)) {
    if (f !== '.gitkeep') fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);

  const doctor = await User.create({
    id: DOCTOR_ID,
    email: 'claire.lefevre@endoclinic.fr',
    password: passwordHash,
    role: 'doctor',
    doctorReferralCode: 'DOC-THYRO1',
    registrationStatus: 'approved',
    approvedAt: at(-200),
    isEmailVerified: true,
    emailVerifiedAt: at(-200),
    profile: { firstName: 'Claire', lastName: 'Lefèvre', avatar: 'CL', speciality: 'Endocrinologie — thyroïde', phone: '01 84 25 63 00' }
  });
  console.log(`👩‍⚕️  Médecin : ${doctor.email}  (code ${doctor.doctorReferralCode})`);

  for (const p of PATIENTS) {
    const user = await User.create({
      id: p.id,
      email: p.email,
      password: passwordHash,
      role: 'patient',
      treatingDoctorId: DOCTOR_ID,
      registrationStatus: 'approved',
      approvedAt: at(-130),
      approvedByDoctorId: DOCTOR_ID,
      isEmailVerified: true,
      emailVerifiedAt: at(-130),
      profile: p.profile
    });

    for (const m of p.medications) {
      await Medication.create({
        id: `med-${uuid()}`, patientId: p.id, name: m.name, dosage: m.dosage, frequency: m.frequency,
        times: m.times, startDate: at(-120), indication: m.indication, prescribedBy: DOCTOR_NAME,
        instructions: m.instructions, stock: m.stock, color: m.color
      });
    }

    for (const a of p.appointments) {
      await Appointment.create({
        id: `apt-${uuid()}`, patientId: p.id, doctorId: DOCTOR_ID, title: a.title,
        description: a.title, date: a.date, time: a.time, location: a.location, type: a.type, status: a.status
      });
    }

    for (const s of p.symptoms) {
      await Symptom.create({
        id: `sym-${uuid()}`, patientId: p.id, date: at(s.d, 8, 30), mood: s.mood,
        symptoms: s.s, vitals: s.v, notes: s.notes
      });
    }

    for (const c of p.checkins) {
      await ThyroidCheckin.create({
        id: `thy-${uuid()}`, patientId: p.id, checkedAt: at(c.d, 8, 0),
        answers: c.answers, measurements: c.measurements, category: c.category,
        riskScore: c.riskScore, reasons: c.reasons
      });
      if (c.category !== 'normal') {
        await Notification.create({
          id: `notif-${uuid()}`, patientId: p.id, type: 'alert',
          title: `Checking thyroïde : ${CATEGORY_LABELS[c.category]}`,
          message: `Un checking patient nécessite votre attention. Score ${c.riskScore}. ${c.reasons.join(' ')}`,
          read: c.read === true, timestamp: at(c.d, 8, 1)
        });
      }
    }

    if (p.watch) {
      const types = [
        ['resting_heart_rate', 'bpm', p.watch.restHR],
        ['heart_rate', 'bpm', p.watch.hr],
        ['body_mass', 'kg', p.watch.mass],
        ['steps', 'count', p.watch.steps],
        ['oxygen_saturation', '%', p.watch.o2]
      ];
      for (const [type, unit, series] of types) {
        if (!series) continue;
        series.forEach((value, i) => {
          AppleHealthMeasurementQueue.push({
            id: `ahm-${uuid()}`, patientId: p.id, externalId: `demo-${type}-${p.id}-${i}`,
            syncId: `sync-${p.id}-${i}`, type, value, unit,
            measuredAt: at(-(series.length - i), 7, 15),
            syncedAt: at(-(series.length - i), 7, 20), source: 'Apple Watch', metadata: { device: 'Apple Watch', demo: true }
          });
        });
      }
    }

    for (const d of p.documents) {
      await makeDocument({
        patientId: p.id, name: d.name, type: d.type, description: d.description,
        uploadedByRole: d.by, uploadedById: d.by === 'doctor' ? DOCTOR_ID : p.id,
        daysAgo: d.daysAgo, lines: d.lines
      });
    }

    for (let i = 0; i < p.chat.length; i += 1) {
      const [type, message] = p.chat[i];
      await ChatMessage.create({ id: `chat-${uuid()}`, patientId: p.id, type, message, timestamp: at(-2, 18, i * 2) });
    }

    for (const msg of p.messages) {
      const senderRole = msg.from;
      await Message.create({
        id: `msg-${uuid()}`, patientId: p.id, doctorId: DOCTOR_ID,
        senderId: senderRole === 'doctor' ? DOCTOR_ID : p.id, senderRole,
        body: msg.body, readAt: msg.unread ? null : at(msg.d, 12, 0),
        createdAt: at(msg.d, 11, 0), updatedAt: at(msg.d, 11, 0)
      });
    }

    for (const n of p.notifications) {
      await Notification.create({
        id: `notif-${uuid()}`, patientId: p.id, type: n.type, title: n.title,
        message: n.message, read: n.read, timestamp: at(n.d, 9, 0)
      });
    }

    console.log(`🧑  Patient : ${user.email}  — ${p.profile.diagnosis}`);
  }

  if (AppleHealthMeasurementQueue.length) {
    await AppleHealthMeasurement.bulkCreate(AppleHealthMeasurementQueue);
    console.log(`⌚  ${AppleHealthMeasurementQueue.length} mesures Apple Watch`);
  }

  console.log('\n✅ Données de démo prêtes.');
  console.log('────────────────────────────────────────────');
  console.log('  Mot de passe (tous les comptes) : demo1234');
  console.log('  Médecin  : claire.lefevre@endoclinic.fr');
  console.log('  Code médecin (inscription patient) : DOC-THYRO1');
  console.log('  Patients :');
  PATIENTS.forEach((p) => console.log(`    - ${p.email}`));
  console.log('────────────────────────────────────────────');

  await sequelize.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Échec du seed :', err);
  process.exit(1);
});

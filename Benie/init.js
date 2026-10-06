const sequelize = require('./database');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const Symptom = require('../models/Symptom');
const ChatMessage = require('../models/ChatMessage');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const ThyroidCheckin = require('../models/ThyroidCheckin');
const AppleHealthMeasurement = require('../models/AppleHealthMeasurement');
const Message = require('../models/Message');

// Définir les associations
async function initializeDatabase() {
  try {
    // Associations
    User.hasMany(Appointment, { foreignKey: 'patientId' });
    Appointment.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });

    User.hasMany(Medication, { foreignKey: 'patientId' });
    Medication.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(Symptom, { foreignKey: 'patientId' });
    Symptom.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(ChatMessage, { foreignKey: 'patientId' });
    ChatMessage.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(Document, { foreignKey: 'patientId' });
    Document.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(Notification, { foreignKey: 'patientId' });
    Notification.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(ThyroidCheckin, { foreignKey: 'patientId' });
    ThyroidCheckin.belongsTo(User, { foreignKey: 'patientId' });

    User.hasMany(AppleHealthMeasurement, { foreignKey: 'patientId' });
    AppleHealthMeasurement.belongsTo(User, { foreignKey: 'patientId' });

    // Messagerie patient <-> médecin traitant
    Message.belongsTo(User, { foreignKey: 'patientId', as: 'patient' });
    Message.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
    Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

    // Un médecin peut suivre plusieurs patients.
    User.hasMany(User, { foreignKey: 'treatingDoctorId', as: 'patients' });
    User.belongsTo(User, { foreignKey: 'treatingDoctorId', as: 'treatingDoctor' });

    // Tester la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion MySQL établie');

    // Synchroniser la BD
    await sequelize.sync({ alter: true });
    console.log('📊 Schéma de base de données synchronisé');

  } catch (err) {
    console.error('\n❌ Connexion à la base de données impossible.');
    console.error('   Erreur :', err.name || 'inconnue', '—', err.message || err.parent?.message || '(aucun message)');
    if (err.parent?.code) console.error('   Code   :', err.parent.code);

    // Sans ce détail, l'erreur est illisible : Sequelize ne dit rien quand la
    // configuration est simplement absente (hôte/base/utilisateur undefined).
    const seen = (name) => (process.env[name] ? 'défini' : '—');
    console.error('\n   Variables détectées :');
    console.error('     MYSQL_URL / DATABASE_URL :', seen('MYSQL_URL'), '/', seen('DATABASE_URL'));
    console.error('     DB_HOST / DB_NAME        :', seen('DB_HOST'), '/', seen('DB_NAME'));
    console.error('     MYSQLHOST / MYSQLDATABASE:', seen('MYSQLHOST'), '/', seen('MYSQLDATABASE'));

    const aucune = !process.env.MYSQL_URL && !process.env.DATABASE_URL
      && !process.env.DB_HOST && !process.env.MYSQLHOST;
    if (aucune) {
      console.error('\n   → Aucune variable de base de données n\'est présente.');
      console.error('     En local  : renseignez DB_* dans .env');
      console.error('     Sur Railway : le service applicatif ne reçoit PAS automatiquement');
      console.error('     les variables du service MySQL. Ajoutez une référence, par ex. :');
      console.error('       MYSQL_URL = ${{MySQL.MYSQL_URL}}');
      console.error('     (remplacez « MySQL » par le nom exact du service base de données)');
    } else {
      console.error('\n   → Vérifiez que le service MySQL est démarré et les identifiants corrects.');
    }
    console.error('');
    process.exit(1);
  }
}

module.exports = initializeDatabase;

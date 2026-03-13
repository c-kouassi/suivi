const sequelize = require('./database');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const Symptom = require('../models/Symptom');
const ChatMessage = require('../models/ChatMessage');
const Document = require('../models/Document');
const Notification = require('../models/Notification');

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
    console.error('❌ Erreur lors de l\'initialisation de la BDD:', err.message);
    console.error('Assurez-vous que MySQL est en cours d\'exécution et que les credentials .env sont corrects');
    process.exit(1);
  }
}

module.exports = initializeDatabase;

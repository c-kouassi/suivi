const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Message d'une conversation 1-à-1 entre un patient et son médecin traitant.
// Le fil est identifié par le couple (patientId, doctorId).
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  doctorId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  senderId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  senderRole: {
    type: DataTypes.ENUM('patient', 'doctor'),
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Précision microseconde pour un tri fiable des messages d'une même seconde.
  createdAt: {
    type: DataTypes.DATE(6),
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE(6),
    allowNull: false
  }
}, {
  timestamps: true,
  tableName: 'messages',
  indexes: [
    { fields: ['patientId', 'doctorId', 'createdAt'] }
  ]
});

module.exports = Message;

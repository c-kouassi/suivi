const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Symptom = sequelize.define('Symptom', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  mood: DataTypes.STRING,
  symptoms: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  vitals: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  notes: DataTypes.TEXT
}, {
  timestamps: true,
  tableName: 'symptoms'
});

module.exports = Symptom;

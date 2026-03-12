const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Medication = sequelize.define('Medication', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: DataTypes.STRING,
  frequency: DataTypes.STRING,
  times: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  indication: DataTypes.STRING,
  prescribedBy: DataTypes.STRING,
  instructions: DataTypes.TEXT,
  stock: DataTypes.INTEGER,
  color: DataTypes.STRING
}, {
  timestamps: true,
  tableName: 'medications'
});

module.exports = Medication;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  doctorId: DataTypes.STRING,
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  time: DataTypes.STRING,
  location: DataTypes.STRING,
  type: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('upcoming', 'completed', 'cancelled', 'pending'),
    defaultValue: 'pending'
  }
}, {
  timestamps: true,
  tableName: 'appointments'
});

module.exports = Appointment;

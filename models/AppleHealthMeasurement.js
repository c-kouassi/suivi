const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppleHealthMeasurement = sequelize.define('AppleHealthMeasurement', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  externalId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  syncId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM(
      'heart_rate',
      'resting_heart_rate',
      'oxygen_saturation',
      'steps',
      'active_energy',
      'body_mass',
      'body_temperature',
      'respiratory_rate',
      'blood_glucose',
      'body_fat_percentage',
      'bmi',
      'vo2_max',
      'distance_walking_running',
      'flights_climbed',
      'walking_heart_rate_average',
      'blood_pressure_systolic',
      'blood_pressure_diastolic'
    ),
    allowNull: false
  },
  value: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  measuredAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'Apple Health'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  timestamps: true,
  tableName: 'apple_health_measurements',
  indexes: [
    { fields: ['patientId', 'syncId'] },
    { fields: ['patientId', 'measuredAt'] },
    { fields: ['patientId', 'type'] }
  ]
});

module.exports = AppleHealthMeasurement;

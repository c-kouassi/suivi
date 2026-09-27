const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ThyroidCheckin = sequelize.define('ThyroidCheckin', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  patientId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  checkedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  measurements: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {}
  },
  category: {
    type: DataTypes.ENUM('normal', 'surveillance', 'important', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  reasons: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'thyroid_checkins'
});

module.exports = ThyroidCheckin;

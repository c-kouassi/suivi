const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Document = sequelize.define('Document', {
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
  type: {
    type: DataTypes.ENUM('surgery', 'prescription', 'exam'),
    allowNull: false
  },
  category: DataTypes.STRING,
  uploadDate: DataTypes.DATE,
  fileUrl: DataTypes.STRING
}, {
  timestamps: true,
  tableName: 'documents'
});

module.exports = Document;

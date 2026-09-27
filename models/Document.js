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
    type: DataTypes.ENUM('surgery', 'prescription', 'exam', 'report', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  category: DataTypes.STRING,
  description: DataTypes.TEXT,
  // Fichier stocke sur disque (data/uploads/documents).
  originalName: DataTypes.STRING,
  storedName: DataTypes.STRING,
  mimeType: DataTypes.STRING,
  size: DataTypes.INTEGER,
  // Qui a depose le document.
  uploadedById: DataTypes.STRING,
  uploadedByRole: {
    type: DataTypes.ENUM('patient', 'doctor'),
    allowNull: true
  },
  // 'shared' = visible par le medecin traitant ; 'private' = patient uniquement.
  visibility: {
    type: DataTypes.ENUM('shared', 'private'),
    allowNull: false,
    defaultValue: 'shared'
  },
  uploadDate: DataTypes.DATE,
  fileUrl: DataTypes.STRING
}, {
  timestamps: true,
  tableName: 'documents'
});

module.exports = Document;

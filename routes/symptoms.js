const express = require('express');
const { getDB, saveDB } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/symptoms
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const symptoms = db.symptoms
    .filter(s => s.patientId === req.user.id)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
  res.json(symptoms);
});

// POST /api/symptoms
router.post('/', authenticateToken, (req, res) => {
  const { symptoms, heartRate, bloodPressure, temperature, oxygenSaturation, weight, notes, mood } = req.body;

  const db = getDB();
  const now = new Date();
  const newEntry = {
    id: `sym-${uuidv4()}`,
    patientId: req.user.id,
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
    symptoms: symptoms || [],
    heartRate: heartRate || null,
    bloodPressure: bloodPressure || '',
    temperature: temperature || null,
    oxygenSaturation: oxygenSaturation || null,
    weight: weight || null,
    notes: notes || '',
    mood: mood || 'Moyen'
  };

  db.symptoms.push(newEntry);
  saveDB(db);
  res.status(201).json(newEntry);
});

// GET /api/symptoms/latest
router.get('/latest', authenticateToken, (req, res) => {
  const db = getDB();
  const userSymptoms = db.symptoms
    .filter(s => s.patientId === req.user.id)
    .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  res.json(userSymptoms[0] || null);
});

module.exports = router;

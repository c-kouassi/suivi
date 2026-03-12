const express = require('express');
const authenticateToken = require('../middleware/auth');
const Symptom = require('../models/Symptom');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/symptoms
router.get('/', authenticateToken, async (req, res) => {
  try {
    const symptoms = await Symptom.findAll({
      where: { patientId: req.user.id },
      order: [['date', 'DESC']]
    });
    res.json(symptoms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/symptoms
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { symptoms, heartRate, bloodPressure, temperature, oxygenSaturation, weight, notes, mood } = req.body;

    const newEntry = await Symptom.create({
      id: `sym-${uuidv4()}`,
      patientId: req.user.id,
      date: new Date(),
      mood: mood || 'Moyen',
      symptoms: symptoms || [],
      vitals: {
        heartRate: heartRate || null,
        bloodPressure: bloodPressure || '',
        temperature: temperature || null,
        oxygenSaturation: oxygenSaturation || null,
        weight: weight || null
      },
      notes: notes || ''
    });

    res.status(201).json(newEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/symptoms/latest
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const userSymptom = await Symptom.findOne({
      where: { patientId: req.user.id },
      order: [['date', 'DESC']]
    });

    res.json(userSymptom || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

const express = require('express');
const { getDB, saveDB } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/medications
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const meds = db.medications.filter(m => m.patientId === req.user.id);
  res.json(meds);
});

// POST /api/medications
router.post('/', authenticateToken, (req, res) => {
  const { name, dosage, frequency, times, indication, instructions, startDate, endDate, color } = req.body;

  if (!name || !dosage || !frequency) {
    return res.status(400).json({ error: 'Nom, dosage et fréquence sont requis' });
  }

  const db = getDB();
  const newMed = {
    id: `med-${uuidv4()}`,
    patientId: req.user.id,
    name,
    dosage,
    frequency,
    times: times || [],
    startDate: startDate || new Date().toISOString().split('T')[0],
    endDate: endDate || null,
    indication: indication || '',
    prescribedBy: '',
    instructions: instructions || '',
    stock: 30,
    color: color || '#3498DB'
  };

  db.medications.push(newMed);
  saveDB(db);
  res.status(201).json(newMed);
});

// PUT /api/medications/:id
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const idx = db.medications.findIndex(m => m.id === req.params.id && m.patientId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Médicament introuvable' });

  db.medications[idx] = { ...db.medications[idx], ...req.body };
  saveDB(db);
  res.json(db.medications[idx]);
});

// DELETE /api/medications/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const idx = db.medications.findIndex(m => m.id === req.params.id && m.patientId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Médicament introuvable' });

  db.medications.splice(idx, 1);
  saveDB(db);
  res.json({ message: 'Médicament supprimé' });
});

module.exports = router;

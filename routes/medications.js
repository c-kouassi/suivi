const express = require('express');
const authenticateToken = require('../middleware/auth');
const Medication = require('../models/Medication');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/medications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const meds = await Medication.findAll({
      where: { patientId: req.user.id }
    });
    res.json(meds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/medications
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, dosage, frequency, times, indication, instructions, startDate, endDate, color } = req.body;

    if (!name || !dosage || !frequency) {
      return res.status(400).json({ error: 'Nom, dosage et fréquence sont requis' });
    }

    const newMed = await Medication.create({
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
    });

    res.status(201).json(newMed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/medications/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const med = await Medication.findOne({
      where: { id: req.params.id, patientId: req.user.id }
    });

    if (!med) {
      return res.status(404).json({ error: 'Médicament introuvable' });
    }

    await med.update(req.body);
    res.json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/medications/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const med = await Medication.findOne({
      where: { id: req.params.id, patientId: req.user.id }
    });

    if (!med) {
      return res.status(404).json({ error: 'Médicament introuvable' });
    }

    await med.destroy();
    res.json({ message: 'Médicament supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

const express = require('express');
const { getDB, saveDB } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/appointments
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const appointments = db.appointments
    .filter(a => a.patientId === req.user.id)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
  res.json(appointments);
});

// POST /api/appointments
router.post('/', authenticateToken, (req, res) => {
  const { doctorName, specialty, date, time, location, type, notes } = req.body;

  if (!doctorName || !date || !time) {
    return res.status(400).json({ error: 'Médecin, date et heure sont requis' });
  }

  const db = getDB();
  const newAppointment = {
    id: `apt-${uuidv4()}`,
    patientId: req.user.id,
    doctorId: null,
    doctorName,
    specialty: specialty || '',
    date,
    time,
    location: location || '',
    type: type || 'Consultation',
    status: 'pending',
    notes: notes || ''
  };

  db.appointments.push(newAppointment);
  saveDB(db);
  res.status(201).json(newAppointment);
});

// PUT /api/appointments/:id
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const idx = db.appointments.findIndex(a => a.id === req.params.id && a.patientId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Rendez-vous introuvable' });

  db.appointments[idx] = { ...db.appointments[idx], ...req.body };
  saveDB(db);
  res.json(db.appointments[idx]);
});

// DELETE /api/appointments/:id
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDB();
  const idx = db.appointments.findIndex(a => a.id === req.params.id && a.patientId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Rendez-vous introuvable' });

  db.appointments.splice(idx, 1);
  saveDB(db);
  res.json({ message: 'Rendez-vous supprimé' });
});

module.exports = router;

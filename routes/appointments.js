const express = require('express');
const authenticateToken = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { patientId: req.user.id },
      order: [['date', 'ASC'], ['time', 'ASC']]
    });
    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/appointments
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, date, time, location, type, status } = req.body;

    // Accepter aussi les anciens noms de champs pour compatibilité
    const appointmentTitle = title || req.body.doctorName || 'Rendez-vous';
    const appointmentDescription = description || req.body.notes || '';

    if (!date || !time) {
      return res.status(400).json({ error: 'Date et heure sont requis' });
    }

    const newAppointment = await Appointment.create({
      id: `apt-${uuidv4()}`,
      patientId: req.user.id,
      doctorId: null,
      title: appointmentTitle,
      description: appointmentDescription,
      date,
      time,
      location: location || '',
      type: type || 'consultation',
      status: status || 'pending'
    });

    res.status(201).json(newAppointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/appointments/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, patientId: req.user.id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous introuvable' });
    }

    await appointment.update(req.body);
    res.json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/appointments/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, patientId: req.user.id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous introuvable' });
    }

    await appointment.destroy();
    res.json({ message: 'Rendez-vous supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

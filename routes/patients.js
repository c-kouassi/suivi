const express = require('express');
const authenticateToken = require('../middleware/auth');
const Document = require('../models/Document');
const Notification = require('../models/Notification');

const router = express.Router();

// GET /api/documents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const docs = await Document.findAll({
      where: { patientId: req.user.id },
      order: [['uploadDate', 'DESC']]
    });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/patients/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifs = await Notification.findAll({
      where: { patientId: req.user.id },
      order: [['timestamp', 'DESC']],
      limit: 50
    });
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/patients/notifications/read-all : tout marquer comme lu
router.put('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    const [updated] = await Notification.update(
      { read: true },
      { where: { patientId: req.user.id, read: false } }
    );
    res.json({ updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/patients/notifications/:id/read : marquer une notification comme lue
router.put('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notif = await Notification.findOne({
      where: { id: req.params.id, patientId: req.user.id }
    });
    if (!notif) {
      return res.status(404).json({ error: 'Notification introuvable' });
    }
    await notif.update({ read: true });
    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

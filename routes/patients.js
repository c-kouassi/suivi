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
      order: [['timestamp', 'DESC']]
    });
    res.json(notifs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

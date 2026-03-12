const express = require('express');
const { getDB } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/documents
router.get('/', authenticateToken, (req, res) => {
  const db = getDB();
  const docs = db.documents.filter(d => d.patientId === req.user.id);
  res.json(docs);
});

// GET /api/notifications
router.get('/notifications', authenticateToken, (req, res) => {
  const db = getDB();
  const notifs = db.notifications
    .filter(n => n.patientId === req.user.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notifs);
});

module.exports = router;

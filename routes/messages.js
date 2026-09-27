const express = require('express');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/auth');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();

function profileName(user) {
  const p = user?.profile || {};
  return `${p.firstName || ''} ${p.lastName || ''}`.trim() || user?.email || 'Utilisateur';
}

// Résout le fil (patientId, doctorId) et vérifie les droits.
async function resolveThread(reqUser, patientIdInput) {
  if (reqUser.role === 'patient') {
    const patient = await User.findByPk(reqUser.id);
    if (!patient || !patient.treatingDoctorId) {
      return { error: { status: 400, message: 'Aucun médecin traitant n’est rattaché à votre compte.' } };
    }
    return { patientId: patient.id, doctorId: patient.treatingDoctorId };
  }
  if (reqUser.role === 'doctor') {
    if (!patientIdInput) {
      return { error: { status: 400, message: 'Paramètre patientId requis.' } };
    }
    const patient = await User.findOne({
      where: { id: patientIdInput, role: 'patient', treatingDoctorId: reqUser.id },
      attributes: ['id']
    });
    if (!patient) {
      return { error: { status: 403, message: 'Ce patient n’est pas rattaché à votre compte.' } };
    }
    return { patientId: patient.id, doctorId: reqUser.id };
  }
  return { error: { status: 403, message: 'Rôle non autorisé.' } };
}

function serialize(message, meId) {
  return {
    id: message.id,
    body: message.body,
    senderRole: message.senderRole,
    senderId: message.senderId,
    mine: message.senderId === meId,
    readAt: message.readAt,
    createdAt: message.createdAt
  };
}

// GET /api/messages/unread-count  -> { count }
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Message.count({
      where: {
        readAt: null,
        senderId: { [Op.ne]: req.user.id },
        ...(req.user.role === 'patient'
          ? { patientId: req.user.id }
          : { doctorId: req.user.id })
      }
    });
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/messages/threads  (médecin) -> liste des conversations
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Réservé aux médecins.' });
    }

    const patients = await User.findAll({
      where: { role: 'patient', treatingDoctorId: req.user.id },
      attributes: ['id', 'email', 'profile']
    });

    const threads = await Promise.all(patients.map(async (patient) => {
      const [last, unread] = await Promise.all([
        Message.findOne({
          where: { patientId: patient.id, doctorId: req.user.id },
          order: [['createdAt', 'DESC']]
        }),
        Message.count({
          where: {
            patientId: patient.id,
            doctorId: req.user.id,
            readAt: null,
            senderId: { [Op.ne]: req.user.id }
          }
        })
      ]);
      return {
        patientId: patient.id,
        patientName: profileName(patient),
        patientEmail: patient.email,
        lastMessage: last ? last.body : null,
        lastAt: last ? last.createdAt : null,
        lastMine: last ? last.senderId === req.user.id : false,
        unread
      };
    }));

    threads.sort((a, b) => {
      if (!a.lastAt && !b.lastAt) return a.patientName.localeCompare(b.patientName);
      if (!a.lastAt) return 1;
      if (!b.lastAt) return -1;
      return new Date(b.lastAt) - new Date(a.lastAt);
    });

    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/messages            (patient : son fil)
// GET /api/messages?patientId= (médecin : fil avec ce patient)
// Marque comme lus les messages reçus.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const thread = await resolveThread(req.user, req.query.patientId);
    if (thread.error) {
      return res.status(thread.error.status).json({ error: thread.error.message });
    }

    const messages = await Message.findAll({
      where: { patientId: thread.patientId, doctorId: thread.doctorId },
      order: [['createdAt', 'ASC']]
    });

    await Message.update(
      { readAt: new Date() },
      {
        where: {
          patientId: thread.patientId,
          doctorId: thread.doctorId,
          readAt: null,
          senderId: { [Op.ne]: req.user.id }
        }
      }
    );

    const [patient, doctor] = await Promise.all([
      User.findByPk(thread.patientId, { attributes: ['id', 'email', 'profile'] }),
      User.findByPk(thread.doctorId, { attributes: ['id', 'email', 'profile'] })
    ]);

    res.json({
      patientId: thread.patientId,
      doctorId: thread.doctorId,
      patientName: profileName(patient),
      doctorName: profileName(doctor),
      messages: messages.map((m) => serialize(m, req.user.id))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/messages  { content, patientId? }
router.post('/', authenticateToken, async (req, res) => {
  try {
    const content = (req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }
    if (content.length > 4000) {
      return res.status(400).json({ error: 'Message trop long (4000 caractères maximum).' });
    }

    const thread = await resolveThread(req.user, req.body.patientId);
    if (thread.error) {
      return res.status(thread.error.status).json({ error: thread.error.message });
    }

    const message = await Message.create({
      id: `msg-${uuidv4()}`,
      patientId: thread.patientId,
      doctorId: thread.doctorId,
      senderId: req.user.id,
      senderRole: req.user.role,
      body: content,
      readAt: null
    });

    res.status(201).json(serialize(message, req.user.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

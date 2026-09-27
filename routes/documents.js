const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../middleware/auth');
const Document = require('../models/Document');
const User = require('../models/User');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads', 'documents');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DOCUMENT_TYPES = ['surgery', 'prescription', 'exam', 'report', 'other'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 12);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new multer.MulterError('LIMITED_FILE_TYPE', file.fieldname));
  }
}).single('file');

// Enveloppe multer pour renvoyer des erreurs JSON propres.
function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Fichier trop volumineux (10 Mo maximum).' });
      }
      if (err.code === 'LIMITED_FILE_TYPE') {
        return res.status(415).json({ error: 'Type de fichier non autorisé (PDF, image, Word ou texte).' });
      }
      return res.status(400).json({ error: `Envoi invalide : ${err.message}` });
    }
    console.error(err);
    return res.status(500).json({ error: 'Erreur lors de la réception du fichier.' });
  });
}

function safeUnlink(storedName) {
  if (!storedName) return;
  const target = path.join(UPLOAD_DIR, path.basename(storedName));
  fs.promises.unlink(target).catch(() => {});
}

function serializeDocument(doc) {
  return {
    id: doc.id,
    patientId: doc.patientId,
    name: doc.name,
    type: doc.type,
    category: doc.category,
    description: doc.description,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    uploadedById: doc.uploadedById,
    uploadedByRole: doc.uploadedByRole,
    visibility: doc.visibility,
    uploadDate: doc.uploadDate,
    createdAt: doc.createdAt,
    downloadUrl: `/api/documents/${doc.id}/download`
  };
}

// Determine le patient cible et verifie le droit d'acces.
// Patient -> lui-meme. Medecin -> un de ses patients (patientId requis).
async function resolvePatientScope(reqUser, patientIdInput) {
  if (reqUser.role === 'patient') {
    return { patientId: reqUser.id };
  }
  if (reqUser.role === 'doctor') {
    if (!patientIdInput) {
      return { error: { status: 400, message: 'Paramètre patientId requis pour un médecin.' } };
    }
    const patient = await User.findOne({
      where: { id: patientIdInput, role: 'patient', treatingDoctorId: reqUser.id },
      attributes: ['id']
    });
    if (!patient) {
      return { error: { status: 403, message: 'Ce patient n’est pas rattaché à votre compte.' } };
    }
    return { patientId: patient.id };
  }
  return { error: { status: 403, message: 'Rôle non autorisé.' } };
}

async function canAccessDocument(reqUser, doc) {
  if (reqUser.role === 'patient') {
    return doc.patientId === reqUser.id;
  }
  if (reqUser.role === 'doctor') {
    if (doc.visibility !== 'shared') return false;
    const patient = await User.findOne({
      where: { id: doc.patientId, role: 'patient', treatingDoctorId: reqUser.id },
      attributes: ['id']
    });
    return Boolean(patient);
  }
  return false;
}

// POST /api/documents  (multipart, champ "file")
router.post('/', authenticateToken, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu (champ "file").' });
    }

    const scope = await resolvePatientScope(req.user, req.body.patientId);
    if (scope.error) {
      safeUnlink(req.file.filename);
      return res.status(scope.error.status).json({ error: scope.error.message });
    }

    const rawType = String(req.body.type || '').toLowerCase();
    const type = DOCUMENT_TYPES.includes(rawType) ? rawType : 'other';
    const visibility = req.body.visibility === 'private' ? 'private' : 'shared';
    const name = (req.body.name && String(req.body.name).trim())
      || req.file.originalname
      || 'Document';

    const document = await Document.create({
      id: `doc-${uuidv4()}`,
      patientId: scope.patientId,
      name,
      type,
      category: req.body.category ? String(req.body.category).trim() : null,
      description: req.body.description ? String(req.body.description).trim() : null,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedById: req.user.id,
      uploadedByRole: req.user.role,
      visibility,
      uploadDate: new Date(),
      fileUrl: null
    });

    res.status(201).json(serializeDocument(document));
  } catch (err) {
    if (req.file) safeUnlink(req.file.filename);
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/documents            (patient : ses documents)
// GET /api/documents?patientId= (médecin : documents partagés d'un de ses patients)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const scope = await resolvePatientScope(req.user, req.query.patientId);
    if (scope.error) {
      return res.status(scope.error.status).json({ error: scope.error.message });
    }

    const where = { patientId: scope.patientId };
    if (req.user.role === 'doctor') {
      where.visibility = 'shared';
    }

    const documents = await Document.findAll({
      where,
      order: [['uploadDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(documents.map(serializeDocument));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/documents/:id  (métadonnées)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document || !(await canAccessDocument(req.user, document))) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    res.json(serializeDocument(document));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/documents/:id/download  (?inline=1 pour affichage navigateur)
router.get('/:id/download', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document || !(await canAccessDocument(req.user, document))) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    if (!document.storedName) {
      return res.status(410).json({ error: 'Aucun fichier associé à ce document.' });
    }

    const absPath = path.join(UPLOAD_DIR, path.basename(document.storedName));
    if (!fs.existsSync(absPath)) {
      return res.status(410).json({ error: 'Fichier introuvable sur le serveur.' });
    }

    const disposition = req.query.inline === '1' ? 'inline' : 'attachment';
    const filename = document.originalName || document.name || 'document';
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(filename).replace(/['()]/g, '')}"`
    );
    fs.createReadStream(absPath).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/documents/:id  (patient propriétaire : renommer, décrire, visibilité, type)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document || document.patientId !== req.user.id || req.user.role !== 'patient') {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    const patch = {};
    if (typeof req.body.name === 'string' && req.body.name.trim()) patch.name = req.body.name.trim();
    if (typeof req.body.description === 'string') patch.description = req.body.description.trim() || null;
    if (req.body.visibility === 'shared' || req.body.visibility === 'private') patch.visibility = req.body.visibility;
    if (DOCUMENT_TYPES.includes(String(req.body.type || '').toLowerCase())) {
      patch.type = String(req.body.type).toLowerCase();
    }

    await document.update(patch);
    res.json(serializeDocument(document));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/documents/:id  (patient propriétaire ou médecin traitant)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document || !(await canAccessDocument(req.user, document))) {
      return res.status(404).json({ error: 'Document introuvable' });
    }
    // Un patient ne supprime pas un document déposé par son médecin.
    if (req.user.role === 'patient' && document.uploadedByRole === 'doctor') {
      return res.status(403).json({ error: 'Ce document a été ajouté par votre médecin.' });
    }

    safeUnlink(document.storedName);
    await document.destroy();
    res.json({ message: 'Document supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

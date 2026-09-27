const express = require('express');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const Symptom = require('../models/Symptom');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const ThyroidCheckin = require('../models/ThyroidCheckin');
const AppleHealthMeasurement = require('../models/AppleHealthMeasurement');
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

function ensureDoctor(req, res, next) {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Accès réservé aux médecins' });
  }
  next();
}

// GET /api/doctors/me/patients
router.get('/me/patients', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patients = await User.findAll({
      where: {
        role: 'patient',
        treatingDoctorId: req.user.id,
        registrationStatus: 'approved'
      },
      attributes: ['id', 'email', 'role', 'treatingDoctorId', 'profile', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/patients/available
router.get('/me/patients/available', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patients = await User.findAll({
      where: {
        role: 'patient',
        treatingDoctorId: null,
        registrationStatus: 'approved'
      },
      attributes: ['id', 'email', 'profile', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json(patients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/overview
router.get('/me/overview', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patients = await User.findAll({
      where: {
        role: 'patient',
        treatingDoctorId: req.user.id,
        registrationStatus: 'approved'
      },
      attributes: ['id']
    });

    const patientIds = patients.map((p) => p.id);

    if (patientIds.length === 0) {
      return res.json({
        patientCount: 0,
        upcomingAppointments: 0,
        alertsCount: 0,
        recentDocuments: 0
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [upcomingAppointments, alertsCount, recentDocuments] = await Promise.all([
      Appointment.count({
        where: {
          patientId: patientIds,
          status: ['upcoming', 'pending'],
          date: { [Op.gte]: startOfToday }
        }
      }),
      Notification.count({
        where: {
          patientId: patientIds,
          read: false,
          type: 'alert'
        }
      }),
      Document.count({
        where: {
          patientId: patientIds,
          visibility: 'shared'
        }
      })
    ]);

    res.json({
      patientCount: patientIds.length,
      upcomingAppointments,
      alertsCount,
      recentDocuments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/patients/:patientId/medical-info
router.get('/me/patients/:patientId/medical-info', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id
      },
      attributes: ['id', 'email', 'profile', 'createdAt', 'updatedAt']
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable pour ce médecin' });
    }

    const [appointments, medications, latestSymptom, thyroidCheckins, appleHealthMeasurements, documents, notifications] = await Promise.all([
      Appointment.findAll({
        where: { patientId: patient.id },
        order: [['date', 'DESC']],
        limit: 8
      }),
      Medication.findAll({
        where: { patientId: patient.id },
        order: [['createdAt', 'DESC']],
        limit: 8
      }),
      Symptom.findOne({
        where: { patientId: patient.id },
        order: [['date', 'DESC']]
      }),
      ThyroidCheckin.findAll({
        where: { patientId: patient.id },
        order: [['checkedAt', 'DESC']],
        limit: 10
      }),
      AppleHealthMeasurement.findAll({
        where: { patientId: patient.id },
        order: [['measuredAt', 'DESC']],
        limit: 20
      }),
      Document.findAll({
        where: { patientId: patient.id, visibility: 'shared' },
        order: [['uploadDate', 'DESC'], ['createdAt', 'DESC']],
        limit: 20
      }),
      Notification.findAll({
        where: { patientId: patient.id },
        order: [['timestamp', 'DESC']],
        limit: 8
      })
    ]);

    res.json({
      patient,
      appointments,
      medications,
      latestSymptom,
      thyroidCheckins,
      appleHealthMeasurements,
      documents: documents.map((doc) => {
        const plain = doc.toJSON();
        delete plain.storedName;
        plain.downloadUrl = `/api/documents/${plain.id}/download`;
        return plain;
      }),
      notifications
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/doctors/me/patients/:patientId/notify
router.post('/me/patients/:patientId/notify', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Titre et message sont requis' });
    }

    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable pour ce médecin' });
    }

    const notif = await Notification.create({
      id: `notif-${uuidv4()}`,
      patientId: patient.id,
      title,
      message,
      type: ['appointment', 'medication', 'alert', 'message'].includes(type) ? type : 'message',
      read: false,
      timestamp: new Date()
    });

    res.status(201).json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/doctors/me/patients/:patientId/appointments
router.post('/me/patients/:patientId/appointments', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const { title, description, date, time, location, type, status } = req.body;

    if (!title || !date || !time) {
      return res.status(400).json({ error: 'Titre, date et heure sont requis' });
    }

    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable pour ce médecin' });
    }

    const appointment = await Appointment.create({
      id: `apt-${uuidv4()}`,
      patientId: patient.id,
      doctorId: req.user.id,
      title,
      description: description || '',
      date,
      time,
      location: location || '',
      type: type || 'consultation',
      status: ['upcoming', 'completed', 'cancelled', 'pending'].includes(status) ? status : 'upcoming'
    });

    res.status(201).json(appointment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/available
router.get('/available', async (req, res) => {
  try {
    const doctors = await User.findAll({
      where: { role: 'doctor' },
      attributes: ['id', 'email', 'profile']
    });

    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/patients/:patientId/assign
router.put('/me/patients/:patientId/assign', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        registrationStatus: 'approved'
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable' });
    }

    const doctor = await User.findOne({
      where: {
        id: req.user.id,
        role: 'doctor'
      }
    });

    const doctorFirstName = doctor && doctor.profile ? doctor.profile.firstName || '' : '';
    const doctorLastName = doctor && doctor.profile ? doctor.profile.lastName || '' : '';
    const doctorName = `Dr. ${doctorFirstName} ${doctorLastName}`.trim();

    await patient.update({
      treatingDoctorId: req.user.id,
      profile: {
        ...(patient.profile || {}),
        treatingDoctor: doctorName
      }
    });

    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/patients/:patientId/unassign
router.put('/me/patients/:patientId/unassign', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable pour ce médecin' });
    }

    await patient.update({
      treatingDoctorId: null,
      profile: {
        ...(patient.profile || {}),
        treatingDoctor: null
      }
    });

    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const CHECKIN_CATEGORIES = ['normal', 'surveillance', 'important', 'urgent'];
const TSH_RANGE = { min: 0.4, max: 4.0 };

// GET /api/doctors/me/kpi : indicateurs visuels du cabinet
router.get('/me/kpi', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patients = await User.findAll({
      where: { role: 'patient', treatingDoctorId: req.user.id, registrationStatus: 'approved' },
      attributes: ['id', 'email', 'profile']
    });

    const categoryDistribution = { normal: 0, surveillance: 0, important: 0, urgent: 0, none: 0 };
    const patientsTsh = [];
    const priorityCases = [];

    await Promise.all(patients.map(async (p) => {
      const profile = p.profile || {};
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || p.email;

      const [last, unreadAlerts, lastSymptom] = await Promise.all([
        ThyroidCheckin.findOne({ where: { patientId: p.id }, order: [['checkedAt', 'DESC']] }),
        Notification.count({ where: { patientId: p.id, type: 'alert', read: false } }),
        Symptom.findOne({ where: { patientId: p.id }, order: [['date', 'DESC']], attributes: ['date'] })
      ]);

      categoryDistribution[last && CHECKIN_CATEGORIES.includes(last.category) ? last.category : 'none'] += 1;

      const tsh = last && last.measurements ? Number(last.measurements.tsh) : null;
      patientsTsh.push({
        patientId: p.id,
        name,
        category: last ? last.category : null,
        tsh: Number.isFinite(tsh) ? tsh : null,
        date: last ? last.checkedAt : null,
        inRange: Number.isFinite(tsh) ? tsh >= TSH_RANGE.min && tsh <= TSH_RANGE.max : null
      });

      if (last && (last.category === 'urgent' || last.category === 'important')) {
        const m = last.measurements || {};
        priorityCases.push({
          patientId: p.id,
          name,
          diagnosis: profile.diagnosis || null,
          category: last.category,
          riskScore: last.riskScore,
          reasons: Array.isArray(last.reasons) ? last.reasons : [],
          checkedAt: last.checkedAt,
          tsh: Number.isFinite(tsh) ? tsh : null,
          freeT4: Number.isFinite(Number(m.freeT4)) ? Number(m.freeT4) : null,
          heartRate: Number.isFinite(Number(m.heartRate)) ? Number(m.heartRate) : null,
          unreadAlerts,
          lastSymptomAt: lastSymptom ? lastSymptom.date : null
        });
      }
    }));

    patientsTsh.sort((a, b) => {
      if (a.tsh == null) return 1;
      if (b.tsh == null) return -1;
      return b.tsh - a.tsh;
    });

    const SEV_RANK = { urgent: 0, important: 1 };
    priorityCases.sort((a, b) => {
      if (SEV_RANK[a.category] !== SEV_RANK[b.category]) return SEV_RANK[a.category] - SEV_RANK[b.category];
      if ((b.riskScore || 0) !== (a.riskScore || 0)) return (b.riskScore || 0) - (a.riskScore || 0);
      return new Date(b.checkedAt) - new Date(a.checkedAt);
    });

    res.json({
      patientCount: patients.length,
      categoryDistribution,
      tshRange: TSH_RANGE,
      patientsTsh,
      priorityCases,
      priorityCounts: {
        urgent: priorityCases.filter((c) => c.category === 'urgent').length,
        important: priorityCases.filter((c) => c.category === 'important').length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/patients/:patientId/trends : séries temporelles d'un patient
router.get('/me/patients/:patientId/trends', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: { id: req.params.patientId, role: 'patient', treatingDoctorId: req.user.id },
      attributes: ['id']
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient introuvable pour ce médecin' });
    }

    const [checkins, symptoms, ahmMass, ahmRest] = await Promise.all([
      ThyroidCheckin.findAll({ where: { patientId: patient.id }, order: [['checkedAt', 'ASC']], limit: 60 }),
      Symptom.findAll({ where: { patientId: patient.id }, order: [['date', 'ASC']], limit: 60 }),
      AppleHealthMeasurement.findAll({ where: { patientId: patient.id, type: 'body_mass' }, order: [['measuredAt', 'ASC']], limit: 120 }),
      AppleHealthMeasurement.findAll({ where: { patientId: patient.id, type: 'resting_heart_rate' }, order: [['measuredAt', 'ASC']], limit: 120 })
    ]);

    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    res.json({
      tshRange: TSH_RANGE,
      checkins: checkins.map((c) => {
        const m = c.measurements || {};
        return {
          date: c.checkedAt,
          category: c.category,
          riskScore: c.riskScore,
          tsh: num(m.tsh),
          freeT4: num(m.freeT4),
          freeT3: num(m.freeT3),
          heartRate: num(m.heartRate),
          weight: num(m.weight)
        };
      }),
      symptoms: symptoms.map((s) => {
        const v = s.vitals || {};
        return {
          date: s.date,
          heartRate: num(v.heartRate),
          weight: num(v.weight),
          temperature: num(v.temperature),
          symptomCount: Array.isArray(s.symptoms) ? s.symptoms.length : 0
        };
      }),
      appleHealth: {
        body_mass: ahmMass.map((m) => ({ date: m.measuredAt, value: num(m.value) })),
        resting_heart_rate: ahmRest.map((m) => ({ date: m.measuredAt, value: num(m.value) }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Charge les patients approuvés du médecin -> Map(id -> { name, email }).
async function loadPatientDirectory(doctorId) {
  const patients = await User.findAll({
    where: { role: 'patient', treatingDoctorId: doctorId, registrationStatus: 'approved' },
    attributes: ['id', 'email', 'profile']
  });
  const map = new Map();
  patients.forEach((p) => {
    const profile = p.profile || {};
    map.set(p.id, {
      name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || p.email,
      email: p.email
    });
  });
  return map;
}

// GET /api/doctors/me/appointments : rendez-vous à venir de tous les patients du médecin
router.get('/me/appointments', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    if (directory.size === 0) return res.json([]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const appointments = await Appointment.findAll({
      where: {
        patientId: Array.from(directory.keys()),
        date: { [Op.gte]: startOfToday },
        status: { [Op.in]: ['upcoming', 'pending'] }
      },
      order: [['date', 'ASC']]
    });

    res.json(appointments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: directory.get(a.patientId)?.name || 'Patient',
      title: a.title || a.type || 'Rendez-vous',
      date: a.date,
      time: a.time,
      location: a.location,
      status: a.status
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/alerts : alertes non lues de tous les patients du médecin
router.get('/me/alerts', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    if (directory.size === 0) return res.json([]);

    const alerts = await Notification.findAll({
      where: {
        patientId: Array.from(directory.keys()),
        type: 'alert',
        read: false
      },
      order: [['timestamp', 'DESC']]
    });

    res.json(alerts.map((n) => ({
      id: n.id,
      patientId: n.patientId,
      patientName: directory.get(n.patientId)?.name || 'Patient',
      title: n.title,
      message: n.message,
      timestamp: n.timestamp
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/documents : documents partagés de tous les patients du médecin
router.get('/me/documents', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    if (directory.size === 0) return res.json([]);

    const documents = await Document.findAll({
      where: { patientId: Array.from(directory.keys()), visibility: 'shared' },
      order: [['uploadDate', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json(documents.map((d) => ({
      id: d.id,
      patientId: d.patientId,
      patientName: directory.get(d.patientId)?.name || 'Patient',
      name: d.name,
      type: d.type,
      description: d.description,
      size: d.size,
      uploadedByRole: d.uploadedByRole,
      uploadDate: d.uploadDate || d.createdAt,
      downloadUrl: `/api/documents/${d.id}/download`
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/doctors/me/notifications : fil unifié pour la cloche du médecin
// (alertes patients + messages non lus + documents récemment partagés)
router.get('/me/notifications', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    if (directory.size === 0) return res.json({ unread: 0, items: [] });

    const patientIds = Array.from(directory.keys());
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [alerts, unreadMessages, documents] = await Promise.all([
      Notification.findAll({
        where: { patientId: patientIds, type: 'alert' },
        order: [['timestamp', 'DESC']],
        limit: 30
      }),
      Message.findAll({
        where: {
          doctorId: req.user.id,
          readAt: null,
          senderId: { [Op.ne]: req.user.id }
        },
        order: [['createdAt', 'DESC']]
      }),
      Document.findAll({
        where: {
          patientId: patientIds,
          visibility: 'shared',
          uploadedByRole: 'patient',
          createdAt: { [Op.gte]: sevenDaysAgo }
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      })
    ]);

    const items = [];

    for (const a of alerts) {
      items.push({
        id: a.id,
        kind: 'alert',
        read: Boolean(a.read),
        patientId: a.patientId,
        patientName: directory.get(a.patientId)?.name || 'Patient',
        title: a.title,
        message: a.message,
        timestamp: a.timestamp
      });
    }

    // Un seul élément par patient, avec le nombre de messages en attente.
    const byPatient = new Map();
    for (const m of unreadMessages) {
      if (!byPatient.has(m.patientId)) byPatient.set(m.patientId, []);
      byPatient.get(m.patientId).push(m);
    }
    for (const [patientId, msgs] of byPatient) {
      const name = directory.get(patientId)?.name || 'Patient';
      items.push({
        id: `thread-${patientId}`,
        kind: 'message',
        read: false,
        patientId,
        patientName: name,
        title: msgs.length > 1 ? `${msgs.length} nouveaux messages de ${name}` : `Nouveau message de ${name}`,
        message: msgs[0].body,
        timestamp: msgs[0].createdAt
      });
    }

    for (const d of documents) {
      items.push({
        id: d.id,
        kind: 'document',
        read: true, // informatif : pas d'état de lecture à gérer
        patientId: d.patientId,
        patientName: directory.get(d.patientId)?.name || 'Patient',
        title: `Document partagé par ${directory.get(d.patientId)?.name || 'un patient'}`,
        message: d.name,
        timestamp: d.uploadDate || d.createdAt
      });
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      unread: items.filter((i) => !i.read).length,
      items: items.slice(0, 30)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/alerts/read-all : marquer toutes les alertes comme lues
router.put('/me/alerts/read-all', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    if (directory.size === 0) return res.json({ updated: 0 });

    const [updated] = await Notification.update(
      { read: true },
      { where: { patientId: Array.from(directory.keys()), type: 'alert', read: false } }
    );
    res.json({ updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/alerts/:id/read : marquer une alerte patient comme lue
router.put('/me/alerts/:id/read', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const directory = await loadPatientDirectory(req.user.id);
    const alert = await Notification.findOne({
      where: { id: req.params.id, type: 'alert', patientId: Array.from(directory.keys()) }
    });
    if (!alert) {
      return res.status(404).json({ error: 'Alerte introuvable' });
    }
    await alert.update({ read: true });
    res.json(alert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

const express = require('express');
const authenticateToken = require('../middleware/auth');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const Symptom = require('../models/Symptom');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
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

    const [upcomingAppointments, alertsCount, recentDocuments] = await Promise.all([
      Appointment.count({
        where: {
          patientId: patientIds,
          status: ['upcoming', 'pending']
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
          patientId: patientIds
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

    const [appointments, medications, latestSymptom, documents, notifications] = await Promise.all([
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
      Document.findAll({
        where: { patientId: patient.id },
        order: [['uploadDate', 'DESC']],
        limit: 8
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
      documents,
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

// GET /api/doctors/me/patient-registrations/pending
router.get('/me/patient-registrations/pending', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const pendingPatients = await User.findAll({
      where: {
        role: 'patient',
        treatingDoctorId: req.user.id,
        registrationStatus: 'pending'
      },
      attributes: ['id', 'email', 'treatingDoctorId', 'registrationStatus', 'createdAt', 'profile'],
      order: [['createdAt', 'ASC']]
    });

    res.json(pendingPatients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/patient-registrations/:patientId/approve
router.put('/me/patient-registrations/:patientId/approve', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id,
        registrationStatus: 'pending'
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Demande d\'inscription introuvable' });
    }

    await patient.update({
      registrationStatus: 'approved',
      approvedAt: new Date(),
      approvedByDoctorId: req.user.id
    });

    res.json({
      message: 'Inscription patient validée.',
      patient
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/doctors/me/patient-registrations/:patientId/reject
router.put('/me/patient-registrations/:patientId/reject', authenticateToken, ensureDoctor, async (req, res) => {
  try {
    const patient = await User.findOne({
      where: {
        id: req.params.patientId,
        role: 'patient',
        treatingDoctorId: req.user.id,
        registrationStatus: 'pending'
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Demande d\'inscription introuvable' });
    }

    await patient.update({
      registrationStatus: 'rejected',
      approvedAt: null,
      approvedByDoctorId: null
    });

    res.json({
      message: 'Inscription patient refusée.',
      patient
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;

require('dotenv').config();
const sequelize = require('./config/database');
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Medication = require('./models/Medication');
const Symptom = require('./models/Symptom');
const ChatMessage = require('./models/ChatMessage');
const Document = require('./models/Document');
const Notification = require('./models/Notification');

async function initializeDatabase() {
  try {
    console.log('🔄 Synchronisation de la base de données...');
    await sequelize.sync({ force: true }); // force: true = recreate tables
    console.log('✅ Tables créées avec succès');

    // Ajouter données d'exemple
    console.log('📝 Ajout des données d\'exemple...');
    
    const doctor = await User.create({
      id: 'doctor-001',
      email: 'sophie.martin@hopital.fr',
      password: '$2b$10$AFfwYpw6inDF8SP83P8kQua46WgGEbL.ZfMc4zjzhUa.pqFUgZSSy', // password
      role: 'doctor',
      doctorReferralCode: 'DOC-SOPHIE1',
      registrationStatus: 'approved',
      approvedAt: new Date(),
      profile: {
        firstName: 'Sophie',
        lastName: 'Martin',
        speciality: 'Cardiologie'
      }
    });

    // Créer patients
    const patient = await User.create({
      id: 'patient-001',
      email: 'jean.dupont@email.com',
      password: '$2b$10$AFfwYpw6inDF8SP83P8kQua46WgGEbL.ZfMc4zjzhUa.pqFUgZSSy', // password
      role: 'patient',
      treatingDoctorId: 'doctor-001',
      registrationStatus: 'approved',
      approvedAt: new Date(),
      approvedByDoctorId: 'doctor-001',
      profile: {
        firstName: 'Jean',
        lastName: 'Dupont',
        dateOfBirth: '1968-03-15',
        phone: '06 12 34 56 78',
        address: '12 rue des Lilas, 75010 Paris',
        hospitalDischargeDate: '2026-03-05',
        diagnosis: 'Pontage coronarien',
        treatingDoctor: 'Dr. Sophie Martin',
        hospitalStay: 'CHU Paris Nord - Service Cardiologie',
        avatar: 'JD'
      }
    });

    // Créer medications
    await Medication.create({
      id: 'med-001',
      patientId: 'patient-001',
      name: 'Aspirine',
      dosage: '100 mg',
      frequency: '1 fois par jour',
      times: ['08:00'],
      startDate: '2026-03-05',
      indication: 'Anticoagulant',
      prescribedBy: 'Dr. Sophie Martin',
      instructions: 'Prendre pendant le repas',
      stock: 25,
      color: '#E74C3C'
    });

    await Medication.create({
      id: 'med-002',
      patientId: 'patient-001',
      name: 'Bisoprolol',
      dosage: '5 mg',
      frequency: '1 fois par jour',
      times: ['08:00'],
      startDate: '2026-03-05',
      indication: 'Bêtabloquant - régulation du rythme cardiaque',
      prescribedBy: 'Dr. Sophie Martin',
      instructions: 'Ne pas arrêter sans avis médical',
      stock: 25,
      color: '#3498DB'
    });

    await Medication.create({
      id: 'med-003',
      patientId: 'patient-001',
      name: 'Ramipril',
      dosage: '5 mg',
      frequency: '1 fois par jour',
      times: ['20:00'],
      startDate: '2026-03-05',
      indication: 'Inhibiteur ECA - protection cardiaque',
      prescribedBy: 'Dr. Sophie Martin',
      instructions: 'Prendre le soir au coucher',
      stock: 25,
      color: '#2ECC71'
    });

    await Medication.create({
      id: 'med-004',
      patientId: 'patient-001',
      name: 'Atorvastatine',
      dosage: '40 mg',
      frequency: '1 fois par jour',
      times: ['20:00'],
      startDate: '2026-03-05',
      indication: 'Statine - contrôle du cholestérol',
      prescribedBy: 'Dr. Sophie Martin',
      instructions: 'Prendre le soir, éviter le pamplemousse',
      stock: 25,
      color: '#9B59B6'
    });

    // Créer appointments
    await Appointment.create({
      id: 'apt-001',
      patientId: 'patient-001',
      doctorId: 'doctor-001',
      title: 'Suivi cardiologique Post-Pontage',
      description: 'Contrôle de suivi 1 mois après le pontage',
      date: '2026-04-05',
      time: '10:00',
      location: 'CHU Paris Nord - Cardiologie',
      type: 'consultation',
      status: 'upcoming'
    });

    await Appointment.create({
      id: 'apt-002',
      patientId: 'patient-001',
      doctorId: 'doctor-001',
      title: 'Suivi cardiologique Post-Pontage (2 mois)',
      description: 'Suivi à 2 mois - Vérification de la cicatrisation',
      date: '2026-05-05',
      time: '14:30',
      location: 'CHU Paris Nord - Cardiologie',
      type: 'consultation',
      status: 'upcoming'
    });

    await Appointment.create({
      id: 'apt-003',
      patientId: 'patient-001',
      doctorId: 'doctor-001',
      title: 'Consultation pré-opératoire',
      description: 'Consultation avant le pontage coronarien',
      date: '2026-02-28',
      time: '09:00',
      location: 'CHU Paris Nord - Cardiologie',
      type: 'consultation',
      status: 'completed'
    });

    // Créer symptoms
    await Symptom.create({
      id: 'sym-001',
      patientId: 'patient-001',
      mood: '😊',
      symptoms: [
        { name: 'Douleur thoracique', severity: 1 },
        { name: 'Fatigue', severity: 2 }
      ],
      vitals: {
        heartRate: 68,
        bloodPressure: '120/80',
        temperature: 36.8,
        oxygenSat: 98,
        weight: 75
      },
      notes: 'Bonne récupération, cicatrice bien fermée',
      date: '2026-03-10'
    });

    await Symptom.create({
      id: 'sym-002',
      patientId: 'patient-001',
      mood: '😐',
      symptoms: [
        { name: 'Douleur thoracique', severity: 2 },
        { name: 'Fatigue', severity: 3 }
      ],
      vitals: {
        heartRate: 72,
        bloodPressure: '125/85',
        temperature: 37,
        oxygenSat: 97,
        weight: 74.5
      },
      notes: 'Quelques douleurs dorso-lombaires',
      date: '2026-03-08'
    });

    await Symptom.create({
      id: 'sym-003',
      patientId: 'patient-001',
      mood: '😊',
      symptoms: [
        { name: 'Essoufflement', severity: 1 }
      ],
      vitals: {
        heartRate: 65,
        bloodPressure: '118/78',
        temperature: 36.9,
        oxygenSat: 99,
        weight: 75.2
      },
      notes: 'Excellente journée, très peu de symptômes',
      date: '2026-03-06'
    });

    // Créer chat messages
    await ChatMessage.create({
      id: 'chat-001',
      patientId: 'patient-001',
      type: 'user',
      message: 'Bonjour, j\'ai une question sur mes médicaments',
      timestamp: new Date()
    });

    // Créer documents
    await Document.create({
      id: 'doc-001',
      patientId: 'patient-001',
      name: 'Rapport opératoire - Pontage coronarien',
      type: 'surgery',
      category: 'Chirurgie',
      uploadDate: '2026-03-05',
      fileUrl: '/documents/rapport-operatoire.pdf'
    });

    await Document.create({
      id: 'doc-002',
      patientId: 'patient-001',
      name: 'Ordonnance post-hospitalisation',
      type: 'prescription',
      category: 'Ordonnance',
      uploadDate: '2026-03-05',
      fileUrl: '/documents/ordonnance.pdf'
    });

    await Document.create({
      id: 'doc-003',
      patientId: 'patient-001',
      name: 'Echocardiogramme - 2026-02-15',
      type: 'exam',
      category: 'Examen',
      uploadDate: '2026-02-15',
      fileUrl: '/documents/echocardiogramme.pdf'
    });

    // Créer notifications
    await Notification.create({
      id: 'notif-001',
      patientId: 'patient-001',
      title: 'Rappel : Rendez-vous dans 3 jours',
      message: 'Suivi cardiologique prévu le 2026-04-05 à 10h00',
      type: 'appointment',
      read: false,
      timestamp: new Date()
    });

    await Notification.create({
      id: 'notif-002',
      patientId: 'patient-001',
      title: 'Nouveau message du Dr. Sophie Martin',
      message: 'Vos résultats d\'examen sont disponibles',
      type: 'message',
      read: false,
      timestamp: new Date()
    });

    console.log('✅ Base de données initialisée avec succès !');
    console.log('\n📋 Identifiants de test:');
    console.log('   Patient: jean.dupont@email.com / password');
    console.log('   Docteur: sophie.martin@hopital.fr / password');
    console.log('   Code médecin (test): DOC-SOPHIE1');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initializeDatabase();

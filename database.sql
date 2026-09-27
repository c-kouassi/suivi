-- Création de la base de données
CREATE DATABASE IF NOT EXISTS suivi_patient;
USE suivi_patient;
-- Table users
CREATE TABLE IF NOT EXISTS `users` (
	`id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL UNIQUE,
	`password` varchar(255) NOT NULL,
	`role` enum('patient', 'doctor') DEFAULT 'patient',
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`dateOfBirth` datetime,
	`phone` varchar(255),
	`address` varchar(255),
	`hospitalDischargeDate` datetime,
	`hospitalStay` varchar(255),
	`diagnosis` text,
	`specialty` varchar(255),
	`treatingDoctor` varchar(255),
	`avatar` varchar(255),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table appointments
CREATE TABLE IF NOT EXISTS `appointments` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`doctorId` varchar(255),
	`doctorName` varchar(255),
	`specialty` varchar(255),
	`date` datetime,
	`time` varchar(255),
	`location` varchar(255),
	`type` varchar(255),
	`status` enum('confirmed', 'pending', 'cancelled') DEFAULT 'confirmed',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table medications
CREATE TABLE IF NOT EXISTS `medications` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`dosage` varchar(255),
	`frequency` varchar(255),
	`times` json,
	`startDate` datetime,
	`endDate` datetime,
	`indication` varchar(255),
	`prescribedBy` varchar(255),
	`instructions` text,
	`stock` int(11),
	`color` varchar(255),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table symptoms
CREATE TABLE IF NOT EXISTS `symptoms` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`date` datetime,
	`mood` varchar(255),
	`symptoms` json,
	`vitals` json,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table thyroid_checkins
CREATE TABLE IF NOT EXISTS `thyroid_checkins` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`checkedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`answers` json NOT NULL,
	`measurements` json NOT NULL,
	`category` enum('normal', 'surveillance', 'important', 'urgent') NOT NULL DEFAULT 'normal',
	`riskScore` int NOT NULL DEFAULT 0,
	`reasons` json NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`type` enum('user', 'ai'),
	`message` text NOT NULL,
	`timestamp` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table documents
CREATE TABLE IF NOT EXISTS `documents` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('Surgery', 'Ordonnance', 'Examen'),
	`date` datetime,
	`description` text,
	`fileUrl` varchar(255),
	`uploadedBy` varchar(255),
	`source` varchar(255),
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table notifications
CREATE TABLE IF NOT EXISTS `notifications` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`type` enum('appointment', 'medication', 'alert', 'message'),
	`title` varchar(255) NOT NULL,
	`message` text,
	`read` tinyint(1) DEFAULT 0,
	`date` datetime,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patientId` (`patientId`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Table apple_health_measurements
CREATE TABLE IF NOT EXISTS `apple_health_measurements` (
	`id` varchar(255) NOT NULL,
	`patientId` varchar(255) NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`syncId` varchar(255) NOT NULL,
	`type` enum(
		'heart_rate',
		'resting_heart_rate',
		'oxygen_saturation',
		'steps',
		'active_energy',
		'body_mass',
		'body_temperature',
		'respiratory_rate',
		'blood_glucose',
		'body_fat_percentage',
		'bmi',
		'vo2_max',
		'distance_walking_running',
		'flights_climbed',
		'walking_heart_rate_average',
		'blood_pressure_systolic',
		'blood_pressure_diastolic'
	) NOT NULL,
	`value` double NOT NULL,
	`unit` varchar(50) NOT NULL,
	`measuredAt` datetime NOT NULL,
	`syncedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`source` varchar(255) DEFAULT 'Apple Health',
	`metadata` json,
	`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (`id`),
	KEY `patient_sync_id` (`patientId`, `syncId`),
	KEY `patient_measured_at` (`patientId`, `measuredAt`),
	FOREIGN KEY (`patientId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
-- Insérer les utilisateurs de test
INSERT INTO `users` (
		`id`,
		`email`,
		`password`,
		`role`,
		`firstName`,
		`lastName`,
		`dateOfBirth`,
		`phone`,
		`address`,
		`hospitalDischargeDate`,
		`diagnosis`,
		`treatingDoctor`,
		`hospitalStay`,
		`avatar`
	)
VALUES (
		'patient-001',
		'jean.dupont@email.com',
		'$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
		'patient',
		'Jean',
		'Dupont',
		'1968-03-15',
		'06 12 34 56 78',
		'12 rue des Lilas, 75010 Paris',
		'2026-03-05',
		'Pontage coronarien',
		'Dr. Sophie Martin',
		'CHU Paris Nord - Service Cardiologie',
		'JD'
	),
	(
		'doctor-001',
		'sophie.martin@hopital.fr',
		'$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
		'doctor',
		'Sophie',
		'Martin',
		NULL,
		'01 23 45 67 89',
		NULL,
		NULL,
		NULL,
		NULL,
		NULL,
		'SM'
	);
-- Insérer les rendez-vous
INSERT INTO `appointments` (
		`id`,
		`patientId`,
		`doctorId`,
		`doctorName`,
		`specialty`,
		`date`,
		`time`,
		`location`,
		`type`,
		`status`,
		`notes`
	)
VALUES (
		'apt-001',
		'patient-001',
		'doctor-001',
		'Dr. Sophie Martin',
		'Cardiologie',
		'2026-03-18 14:30:00',
		'14:30',
		'CHU Paris Nord - Consultation cardiologie, Bât. B',
		'Suivi post-opératoire',
		'confirmed',
		'Contrôle ECG et bilan sanguin requis avant la consultation'
	),
	(
		'apt-002',
		'patient-001',
		'doctor-001',
		'Dr. Sophie Martin',
		'Cardiologie',
		'2026-04-15 09:15:00',
		'09:15',
		'CHU Paris Nord - Consultation cardiologie, Bât. B',
		'Bilan mensuel',
		'confirmed',
		NULL
	),
	(
		'apt-003',
		'patient-001',
		NULL,
		'Dr. Anne Petit',
		'Psychiatrie',
		'2026-03-25 11:00:00',
		'11:00',
		'Centre de Santé Mentale, 5 rue des Trois Frères',
		'Suivi psychologique',
		'confirmed',
		NULL
	);
-- Insérer les médicaments
INSERT INTO `medications` (
		`id`,
		`patientId`,
		`name`,
		`dosage`,
		`frequency`,
		`times`,
		`startDate`,
		`endDate`,
		`indication`,
		`prescribedBy`,
		`instructions`,
		`stock`,
		`color`
	)
VALUES (
		'med-001',
		'patient-001',
		'Aspirine',
		'100 mg',
		'1 fois par jour',
		'["08:00"]',
		'2026-03-05',
		NULL,
		'Anticoagulant',
		'Dr. Sophie Martin',
		'Prendre pendant le repas',
		25,
		'#E74C3C'
	),
	(
		'med-002',
		'patient-001',
		'Bisoprolol',
		'5 mg',
		'1 fois par jour',
		'["08:00"]',
		'2026-03-05',
		NULL,
		'Bêtabloquant - régulation du rythme cardiaque',
		'Dr. Sophie Martin',
		'Ne pas arrêter sans avis médical',
		25,
		'#3498DB'
	),
	(
		'med-003',
		'patient-001',
		'Ramipril',
		'5 mg',
		'1 fois par jour',
		'["20:00"]',
		'2026-03-05',
		NULL,
		'Inhibiteur ECA - protection cardiaque',
		'Dr. Sophie Martin',
		'Prendre le soir au coucher',
		25,
		'#2ECC71'
	),
	(
		'med-004',
		'patient-001',
		'Atorvastatine',
		'40 mg',
		'1 fois par jour',
		'["20:00"]',
		'2026-03-05',
		NULL,
		'Statine - contrôle du cholestérol',
		'Dr. Sophie Martin',
		'Prendre le soir, éviter le pamplemousse',
		25,
		'#9B59B6'
	);
-- Insérer les symptômes
INSERT INTO `symptoms` (
		`id`,
		`patientId`,
		`date`,
		`mood`,
		`symptoms`,
		`vitals`,
		`notes`
	)
VALUES (
		'sym-001',
		'patient-001',
		'2026-03-10 08:30:00',
		'😊',
		'["Légère fatigue"]',
		'{"heartRate": 72, "bloodPressure": "130/80", "temperature": 36.8, "oxygenSaturation": 98, "weight": 78}',
		NULL
	),
	(
		'sym-002',
		'patient-001',
		'2026-03-09 15:45:00',
		'😐',
		'["Petite douleur cicatrice", "Léger malaise général"]',
		'{"heartRate": 78, "bloodPressure": "132/82", "temperature": 37.0, "oxygenSaturation": 97, "weight": 78.5}',
		NULL
	),
	(
		'sym-003',
		'patient-001',
		'2026-03-08 21:15:00',
		'😊',
		'["Bien"]',
		'{"heartRate": 70, "bloodPressure": "128/78", "temperature": 36.9, "oxygenSaturation": 98, "weight": 78}',
		'Bonne journée, récupération progressive'
	);
-- Insérer les documents
INSERT INTO `documents` (
		`id`,
		`patientId`,
		`name`,
		`type`,
		`date`,
		`description`,
		`uploadedBy`,
		`source`
	)
VALUES (
		'doc-001',
		'patient-001',
		'Rapport opératoire - Pontage coronarien',
		'Surgery',
		'2026-03-05',
		'Document chirurgical complet de l\'intervention du 5 mars 2026',
		'Dr. Sophie Martin',
		'CHU Paris Nord'
	),
	(
		'doc-002',
		'patient-001',
		'Ordonnance médicale',
		'Ordonnance',
		'2026-03-05',
		'Prescription de 4 médicaments post-opératoires',
		'Dr. Sophie Martin',
		'CHU Paris Nord'
	),
	(
		'doc-003',
		'patient-001',
		'Bilan sanguin - J0',
		'Examen',
		'2026-03-05',
		'Résultats des analyses de sang post-opératoires immédiates',
		'Laboratoire CHU Paris Nord',
		'CHU Paris Nord'
	);
-- Insérer les notifications
INSERT INTO `notifications` (
		`id`,
		`patientId`,
		`type`,
		`title`,
		`message`,
		`read`,
		`date`
	)
VALUES (
		'notif-001',
		'patient-001',
		'appointment',
		'Rendez-vous demain: Dr. Sophie Martin',
		'Consultation cardiologie demain à 14h30',
		0,
		'2026-03-17 10:00:00'
	),
	(
		'notif-002',
		'patient-001',
		'medication',
		'Rappel de prise de médicament',
		'N\'oubliez pas vos médicaments du soir (Ramipril, Atorvastatine)',
		0,
		'2026-03-12 19:30:00'
	);
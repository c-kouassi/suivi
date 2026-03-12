# 🗄️ Configuration MySQL pour SuiviPatient

## Prérequis

Assurez-vous que **MySQL Server** est installé sur votre machine :

### macOS
```bash
brew install mysql
brew services start mysql
```

### Windows
Téléchargez et installez [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mysql-server
sudo service mysql start
```

## Configuration

### 1. Ouvrir le client MySQL
```bash
mysql -u root -p
```
(Laisser vide pour le mot de passe si c'est une installation locale)

### 2. Exécuter le script de création de BD
```sql
SOURCE /Users/chocobain/devs/stud42/hetic/suivipatient/database.sql;
```

Ou via la ligne de commande :
```bash
mysql -u root < /Users/chocobain/devs/stud42/hetic/suivipatient/database.sql
```

### 3. Vérifier la création
```sql
USE suivi_patient;
SHOW TABLES;
```

Vous devriez voir 7 tables : `users`, `appointments`, `medications`, `symptoms`, `chat_messages`, `documents`, `notifications`

## Variables d'environnement (.env)

Le fichier `.env` contient déjà les paramètres MySQL :

```
DB_HOST=localhost        # Serveur MySQL local
DB_USER=root            # Utilisateur MySQL (root par défaut)
DB_PASSWORD=            # Mot de passe (vide pour installation locale)
DB_NAME=suivi_patient   # Nom de la BD créée
DB_PORT=3306            # Port MySQL standard
```

⚠️ **Si vous avez un mot de passe MySQL** : modifiez `DB_PASSWORD` dans le fichier `.env`

## Démarrer l'application

```bash
npm start
```

L'application se connectera automatiquement à MySQL et synchronisera les schémas.

## Identifiants de test

- **Patient** : `jean.dupont@email.com` / `password`
- **Médecin** : `sophie.martin@hopital.fr` / `password`

## Commandes MySQL utiles

```bash
# Accéder à la base de données
mysql -u root -D suivi_patient

# Voir le schéma d'une table
DESCRIBE users;
DESCRIBE medications;

# Voir les données
SELECT * FROM users;
SELECT * FROM medications WHERE patientId = 'patient-001';
SELECT * FROM appointments WHERE patientId = 'patient-001';

# Réinitialiser la BD (supprimer et recréer)
DROP DATABASE suivi_patient;
SOURCE database.sql;
```

## Dépannage

### Erreur de connexion MySQL
```
❌ Connexion à la base de données échouée: connect ECONNREFUSED
```
✅ Solution : Assurez-vous que MySQL est lancé (`brew services start mysql` ou `service mysql start`)

### Erreur d'authentification
```
ER_ACCESS_DENIED_FOR_USER: Access denied for user 'root'@'localhost'
```
✅ Solution : Vérifiez que `DB_PASSWORD` dans `.env` correspond à votre mot de passe MySQL

### Port 3306 déjà utilisé
```
ER_SERVER_GONE_ERROR: The server closed the connection
```
✅ Solution : Vérifiez que l'une de port 3306 est disponible (`lsof -i :3306` sur macOS)

## Migration depuis le JSON

Tous les codes des routes ont été **automatiquement convertis** de JSON vers MySQL Sequelize. Aucune modification du frontend n'est nécessaire.

- ✅ Les routes API fonctionnent exactement de la même façon
- ✅ Les données sont maintenant persistantes dans MySQL
- ✅ Les associations entre tables sont gérées par Sequelize

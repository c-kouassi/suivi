const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Connexion MySQL.
 *
 * En local on lit DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / DB_PORT (.env).
 * En production, les hébergeurs exposent souvent la base autrement :
 *   - une URL unique  (MYSQL_URL, DATABASE_URL)  ← Railway, Clever Cloud…
 *   - ou des variables MYSQL* préfixées          ← plugin MySQL de Railway
 * On accepte les trois, sans avoir à dupliquer les secrets.
 */
const COMMON = {
  dialect: 'mysql',
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
};

const url = process.env.MYSQL_URL || process.env.DATABASE_URL;

const sequelize = url
  ? new Sequelize(url, COMMON)
  : new Sequelize(
    process.env.DB_NAME || process.env.MYSQLDATABASE,
    process.env.DB_USER || process.env.MYSQLUSER,
    process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    {
      ...COMMON,
      host: process.env.DB_HOST || process.env.MYSQLHOST,
      port: process.env.DB_PORT || process.env.MYSQLPORT
    }
  );

module.exports = sequelize;

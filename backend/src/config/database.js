const mysql = require('mysql2/promise');
const path = require('path')
const result = require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
})

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

module.exports = pool
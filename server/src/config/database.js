const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'devsos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper: get a connection for transactions
const getConnection = () => pool.getConnection();

// Helper: simple query
const query = (sql, params) => pool.execute(sql, params);

module.exports = { pool, getConnection, query };

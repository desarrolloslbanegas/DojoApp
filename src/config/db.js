const mysql = require('mysql2');

const useMockData = process.env.USE_MOCK_DATA === 'true';

if (useMockData) {
  module.exports = null;
} else {
  const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('Faltan variables de entorno para la base de datos:', missing.join(', '));
    process.exit(1);
  }

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error conectando a la base:', err);
      return;
    }
    console.log('Conectado a MySQL con ID ' + connection.threadId);
  });

  module.exports = connection;
}

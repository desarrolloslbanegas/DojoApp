const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'sistema_kiosco_panaderia'
});

connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la base: ' + err.stack);
    return;
  }
  console.log('Conectado a MySQL local con el ID ' + connection.threadId);
});

module.exports = connection;
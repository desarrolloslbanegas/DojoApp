const mysql = require('mysql2');

//DEVELOPMENT LOCAL

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '', 
//   database: 'sistema_kiosco_panaderia'
// });

// connection.connect((err) => {
//   if (err) {
//     console.error('Error conectando a la base: ' + err.stack);
//     return;
//   }
//   console.log('Conectado a MySQL local con el ID ' + connection.threadId);
// });

// module.exports = connection;


//PRODUCTION SERVER
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
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
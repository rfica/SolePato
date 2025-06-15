// backend/config/db.js
const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Poly.9800', // Cambia esto si tu contraseña es diferente
  server: 'localhost', // Cambia esto si tu configuración es diferente
  database: 'CEDS-NDS-V7_1', // Cambia esto por el nombre de tu base de datos
  options: {
    encrypt: true,
    trustServerCertificate: true // Añade esta línea para confiar en certificados autofirmados
  }
};


const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => {
    console.log('Database Connection Failed! Bad Config: ', err);
  });

module.exports = {
  sql, poolPromise
};

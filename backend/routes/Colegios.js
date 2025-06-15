const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('../config/db'); // Asegúrate de tener el archivo de configuración de la base de datos

// Ruta para obtener la lista de colegios
router.get('/obtener-colegios', async (req, res) => {
  try {
    // Obtener la conexión de la base de datos
    const pool = await poolPromise;
    const request = pool.request();

    // Realizar la consulta para obtener los colegios (RefOrganizationTypeId = 10)
    const result = await request.query(`
      SELECT OrganizationId, Name
      FROM [CEDS-NDS-V7_1].[dbo].[Organization]
      WHERE RefOrganizationTypeId = 10
    `);

    // Verificar si hay resultados
    if (result.recordset.length > 0) {
      // Enviar la lista de colegios como respuesta
      res.status(200).json(result.recordset);
    } else {
      res.status(404).json({ message: 'No se encontraron colegios.' });
    }
  } catch (error) {
    console.error('Error al obtener la lista de colegios:', error);
    res.status(500).json({ error: 'Error al obtener la lista de colegios', details: error.message });
  }
});

module.exports = router;

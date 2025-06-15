const sql = require('mssql');
const { poolPromise } = require('../config/db');

// Controlador para obtener Modalidades de Enseñanza
exports.getModalidades = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 38`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener las modalidades:', error);
    res.status(500).send('Error al obtener las modalidades');
  }
};

// Controlador para obtener Jornadas Escolares
exports.getJornadas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 39`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener las jornadas:', error);
    res.status(500).send('Error al obtener las jornadas');
  }
};

// Controlador para obtener Niveles Educacionales
// De aqui salen los niveles para La Matricula
exports.getNiveles = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 40`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los niveles:', error);
    res.status(500).send('Error al obtener los niveles');
  }
};

// Controlador para obtener Ramas de Especialidad
exports.getRamas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 41 ORDER BY Code`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener las ramas:', error);
    res.status(500).send('Error al obtener las ramas');
  }
};

// Controlador para obtener Sectores según la Rama seleccionada
exports.getSectores = async (req, res) => {
  const { ramaId } = req.params;
  console.log('ramaId recibido:', ramaId);  // Esto te permitirá ver si se está recibiendo el parámetro
  if (!ramaId) {
    return res.status(400).send('Falta el ramaId en la solicitud');
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('ramaId', sql.Int, ramaId)
      .query(
        `SELECT RefOrganizationTypeId, CONCAT(Code, ' - ', Description) AS Name 
         FROM RefOrganizationType 
         WHERE RefOrganizationElementTypeId = 42 
         AND Code LIKE (SELECT LEFT(Code, 1) + '%' 
                        FROM RefOrganizationType 
                        WHERE RefOrganizationTypeId = @ramaId)`
      );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los sectores:', error);
    res.status(500).send('Error al obtener los sectores');
  }
};

// Controlador para obtener Especialidades según Sector
exports.getEspecialidades = async (req, res) => {
  const { sectorId } = req.params;

  if (!sectorId) {
    return res.status(400).send('Falta el sectorId en la solicitud');
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('sectorId', sql.Int, sectorId)
      .query(
        `SELECT RefOrganizationTypeId, 
                CONCAT(Code, ' - ', Description) AS Name 
         FROM RefOrganizationType 
         WHERE RefOrganizationElementTypeId = 43
         AND Code LIKE (SELECT LEFT(Code, 6) + '%' 
                        FROM RefOrganizationType 
                        WHERE RefOrganizationTypeId = @sectorId)`
      );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener las especialidades:', error);
    res.status(500).send('Error al obtener las especialidades');
  }
};

// Controlador para obtener Códigos de Enseñanza
exports.getCodigosEnse = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 45 ORDER BY Code`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los códigos de enseñanza:', error);
    res.status(500).send('Error al obtener los códigos de enseñanza');
  }
};

// Controlador para obtener Grados según Código de Enseñanza
exports.getGrados = async (req, res) => {
  const { codigoEnseId } = req.params;

  if (!codigoEnseId) {
    return res.status(400).send('Falta el codigoEnseId en la solicitud');
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('codigoEnseId', sql.Int, codigoEnseId)
      .query(
        `SELECT RefOrganizationTypeId, 
                CONCAT(Code, ' - ', Description) AS Name 
         FROM RefOrganizationType 
         WHERE RefOrganizationElementTypeId = 46 
         AND Code LIKE (SELECT LEFT(Code, 3) + '%' 
                        FROM RefOrganizationType 
                        WHERE RefOrganizationTypeId = @codigoEnseId)`
      );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los grados:', error);
    res.status(500).send('Error al obtener los grados');
  }
};

// Controlador para obtener Tipos de Curso (Simple/Combinado)
exports.getTiposCurso = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(
      `SELECT RefOrganizationTypeId, 
              CONCAT(Code, ' - ', Description) AS Name 
       FROM RefOrganizationType 
       WHERE RefOrganizationElementTypeId = 44`
    );
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener los tipos de curso:', error);
    res.status(500).send('Error al obtener los tipos de curso');
  }
};


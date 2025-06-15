const sql = require('mssql');
const { poolPromise } = require('../../config/db');

// Obtener todos los bloques
exports.getBloques = async (req, res) => {
  try {
    console.log('Consultando todos los bloques...');
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        OrganizationCalendarSessionId AS id, 
        Description AS nombre, 
        Code AS tipo, 
        InstructionalMinutes AS duracion 
      FROM 
        OrganizationCalendarSession
     WHERE 
        Code IN ('Recreo', 'Clases', 'Electivo','Taller')


    `);
    console.log('Bloques obtenidos correctamente.');
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener bloques:', error);
    res.status(500).json({ message: 'Error al obtener bloques.', error: error.message });
  }
};



// Eliminar un bloque
exports.deleteBloque = async (req, res) => {
  const { id } = req.params;

  console.log('Datos recibidos para eliminar un bloque:', { id });

  if (!id) {
    console.log('Validación fallida: Falta el ID del bloque.');
    return res.status(400).json({ message: 'El ID del bloque es obligatorio.' });
  }

  try {
    const pool = await poolPromise;

    console.log(`Eliminando bloque con ID: ${id}...`);
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM OrganizationCalendarSession 
        WHERE OrganizationCalendarSessionId = @id
      `);

    if (result.rowsAffected[0] === 0) {
      console.log(`No se encontró el bloque con ID: ${id}`);
      return res.status(404).json({ message: 'No se encontró el bloque especificado.' });
    }

    console.log(`Bloque eliminado correctamente: ID ${id}`);
    res.status(200).json({ message: 'Bloque eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar el bloque:', error);
    res.status(500).json({ message: 'Error al eliminar el bloque.', error: error.message });
  }
};



exports.createBloque = async (req, res) => {
  const { nombre, tipo, duracion } = req.body;

  console.log('Datos recibidos para crear un bloque:', { nombre, tipo, duracion });

  // Validación de datos
  if (!nombre || typeof nombre !== 'string') {
    return res.status(400).json({ message: 'El nombre es obligatorio y debe ser un texto válido.' });
  }
  if (!tipo || typeof tipo !== 'string') {
    return res.status(400).json({ message: 'El tipo es obligatorio y debe ser un texto válido.' });
  }
  if (!duracion || isNaN(duracion)) {
    return res.status(400).json({ message: 'La duración es obligatoria y debe ser un número válido.' });
  }

  try {
    const pool = await poolPromise;

    console.log('Insertando un nuevo bloque en la base de datos...');
    await pool.request()
      .input('Description', sql.NVarChar, nombre)
      .input('Code', sql.NVarChar, tipo)
      .input('InstructionalMinutes', sql.Int, duracion)
      .query(`
        INSERT INTO OrganizationCalendarSession (Description, Code, InstructionalMinutes) 
        VALUES (@Description, @Code, @InstructionalMinutes)
      `);

    console.log('Bloque creado correctamente:', { nombre, tipo, duracion });
    res.status(201).json({ message: 'Bloque creado correctamente.' });
  } catch (error) {
    console.error('Error al crear el bloque:', error);
    res.status(500).json({ message: 'Error al crear el bloque.', error: error.message });
  }
};



// Editar un bloque
exports.updateBloque = async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, duracion } = req.body;

  console.log('Datos recibidos para actualizar un bloque:', { id, nombre, tipo, duracion });

  // Validación de datos
  if (!id) {
    return res.status(400).json({ message: 'El ID del bloque es obligatorio.' });
  }
  if (!nombre || typeof nombre !== 'string') {
    return res.status(400).json({ message: 'El nombre es obligatorio y debe ser un texto válido.' });
  }
  if (!tipo || typeof tipo !== 'string') {
    return res.status(400).json({ message: 'El tipo es obligatorio y debe ser un texto válido.' });
  }
  if (!duracion || isNaN(duracion)) {
    return res.status(400).json({ message: 'La duración es obligatoria y debe ser un número válido.' });
  }

  try {
    const pool = await poolPromise;

    console.log('Actualizando el bloque en la base de datos...');
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('Description', sql.NVarChar, nombre)
      .input('Code', sql.NVarChar, tipo)
      .input('InstructionalMinutes', sql.Int, duracion)
      .query(`
        UPDATE OrganizationCalendarSession 
        SET Description = @Description, Code = @Code, InstructionalMinutes = @InstructionalMinutes 
        WHERE OrganizationCalendarSessionId = @id
      `);

    if (result.rowsAffected[0] === 0) {
      console.log(`No se encontró el bloque con ID: ${id}`);
      return res.status(404).json({ message: 'No se encontró el bloque especificado.' });
    }

    console.log('Bloque actualizado correctamente:', { id, nombre, tipo, duracion });
    res.status(200).json({ message: 'Bloque actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el bloque:', error);
    res.status(500).json({ message: 'Error al actualizar el bloque.', error: error.message });
  }
};


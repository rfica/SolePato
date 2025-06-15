// backend/controllers/auth/cambiarClaveController.js
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { poolPromise } = require('../../config/db');

exports.cambiarClave = async (req, res) => {
  const { rut, claveActual, nuevaClave } = req.body;
  console.log('[CAMBIAR CLAVE] Intentando cambiar clave para RUT:', rut);

  try {
    const pool = await poolPromise;

    // 1. Buscar autenticación por username
    const usuarioResult = await pool.request()
      .input('rut', sql.VarChar, rut)
      .query(`SELECT PersonId, PasswordHash FROM UserAuthentication WHERE UserName = @rut`);

    if (usuarioResult.recordset.length === 0) {
      console.log('[CAMBIAR CLAVE] Usuario no encontrado en UserAuthentication');
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { PersonId, PasswordHash } = usuarioResult.recordset[0];
    console.log('[CAMBIAR CLAVE] Usuario encontrado. Validando contraseña actual...');

    const esValida = await bcrypt.compare(claveActual, PasswordHash);
    if (!esValida) {
      console.log('[CAMBIAR CLAVE] Clave actual incorrecta.');
      return res.status(401).json({ error: 'Clave actual incorrecta.' });
    }

    const nuevoHash = await bcrypt.hash(nuevaClave, 10);

    await pool.request()
      .input('personId', sql.Int, PersonId)
      .input('nuevoHash', sql.VarChar, nuevoHash)
      .query(`UPDATE UserAuthentication SET PasswordHash = @nuevoHash WHERE PersonId = @personId`);

    console.log('[CAMBIAR CLAVE] Clave actualizada exitosamente para PersonId:', PersonId);
    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('[CAMBIAR CLAVE] Error inesperado:', err);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
};

// backend/controllers/auth/index.js
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { poolPromise } = require('../../config/db');

exports.login = async (req, res) => {
  const { rut, password } = req.body;
  console.log('[LOGIN] RUT recibido:', rut);

  try {
    const pool = await poolPromise;

    // 1. Buscar autenticación por RUT (UserName)
    const authResult = await pool.request()
      .input('rut', sql.VarChar, rut)
      .query(`
        SELECT PersonId, PasswordHash
        FROM UserAuthentication
        WHERE UserName = @rut
      `);

    if (authResult.recordset.length === 0) {
      console.log('[LOGIN] No se encontró el usuario en UserAuthentication');
      return res.status(401).json({ error: 'Usuario no encontrado.' });
    }

    const { PersonId, PasswordHash } = authResult.recordset[0];
    console.log('[LOGIN] Usuario encontrado. Validando contraseña...');

    const esValida = await bcrypt.compare(password, PasswordHash);
    if (!esValida) {
      console.log('[LOGIN] Contraseña inválida');
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // 2. Traer info extendida del usuario
    const result = await pool.request()
      .input('rut', sql.VarChar, rut)
      .query(`
        SELECT TOP 1
          ua.AuthId,
          ua.UserName AS Rut,
          ua.FirstName,
          ua.LastName,
          ua.SecondLastName,
          ua.RoleId,
          r.Name AS RoleName,
          ua.SchoolId,
          o.Name AS OrganizationName
        FROM UserAuthentication ua
        LEFT JOIN Role r ON r.RoleId = ua.RoleId
        LEFT JOIN Organization o ON o.OrganizationId = ua.SchoolId
        WHERE ua.UserName = @rut
      `);

    if (result.recordset.length === 0) {
      console.log('[LOGIN] No se encontró información adicional del usuario');
      return res.status(401).json({ error: 'Usuario sin vínculo organizacional.' });
    }

    const usuario = result.recordset[0];
    console.log('[LOGIN] Usuario completo:', usuario);

    // 3. Actualizar fecha de login
    await pool.request()
      .input('rut', sql.VarChar, rut)
      .query(`UPDATE UserAuthentication SET LastLogin = GETDATE() WHERE UserName = @rut`);

    console.log('[LOGIN] Éxito. Enviando usuario al frontend');
    return res.json({ usuario });
  } catch (err) {
    console.error('[LOGIN] Error inesperado:', err);
    res.status(500).json({ error: 'Error en el servidor al iniciar sesión.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const pool = await poolPromise;
    const { rut } = req.user; // Asumiendo que el middleware de autenticación agrega el RUT al req.user

    const result = await pool.request()
      .input('rut', sql.VarChar, rut)
      .query(`
        SELECT 
          ua.AuthId,
          ua.UserName AS Rut,
          ua.FirstName,
          ua.LastName,
          ua.SecondLastName,
          ua.RoleId,
          r.Name AS RoleName,
          ua.SchoolId,
          o.Name AS OrganizationName
        FROM UserAuthentication ua
        LEFT JOIN Role r ON r.RoleId = ua.RoleId
        LEFT JOIN Organization o ON o.OrganizationId = ua.SchoolId
        WHERE ua.UserName = @rut
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener información del usuario:', err);
    res.status(500).json({ error: 'Error al obtener información del usuario.' });
  }
};

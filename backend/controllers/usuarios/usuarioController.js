const sql = require('mssql');
const { poolPromise } = require('../../config/db');
const bcrypt = require('bcryptjs');

async function registrarUsuario(req, res) {
    let transaction;
    try {
        console.log('Datos recibidos en registrarUsuario:', req.body);
        const {
            clave, nombres, apellidoPaterno, apellidoMaterno, direccion, celular,
            universidad, tituloUniversitario, fechaTitulacion, sexo, rut, correo, telefonoFijo, rol,
            colegio // OrganizationId
        } = req.body;

        // Validar que el RUT/username no exista (insensible a mayúsculas/minúsculas)
        const pool = await poolPromise;
        const checkUser = await pool.request()
            .input('UserName', sql.NVarChar, rut)
            .query(`SELECT * FROM UserAuthentication WHERE LOWER(UserName) = LOWER(@UserName)`);
        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ error: 'El RUT ingresado ya está registrado' });
        }

        // Generar salt y hash de la clave
        const salt = await bcrypt.genSalt(10);
        const hashedClave = await bcrypt.hash(clave, salt);

        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Insertar en UserAuthentication
        const requestAuth = new sql.Request(transaction);
        requestAuth.input('UserName', sql.NVarChar, rut);
        requestAuth.input('PasswordHash', sql.NVarChar, hashedClave);
        requestAuth.input('Salt', sql.NVarChar, salt);
        requestAuth.input('CreatedAt', sql.DateTime, new Date());
        requestAuth.input('FirstName', sql.NVarChar, nombres);
        requestAuth.input('LastName', sql.NVarChar, apellidoPaterno);
        requestAuth.input('SecondLastName', sql.NVarChar, apellidoMaterno);
        requestAuth.input('RefSexId', sql.Int, sexo);
        requestAuth.input('Address', sql.NVarChar, direccion);
        requestAuth.input('Cellphone', sql.NVarChar, celular);
        requestAuth.input('University', sql.NVarChar, universidad);
        requestAuth.input('UniversityDegree', sql.NVarChar, tituloUniversitario);
        requestAuth.input('GraduationDate', sql.Date, fechaTitulacion);
        requestAuth.input('Email', sql.NVarChar, correo);
        requestAuth.input('Landline', sql.NVarChar, telefonoFijo);
        requestAuth.input('RoleId', sql.Int, rol);
        requestAuth.input('SchoolId', sql.Int, colegio);
        requestAuth.input('DeletedAt', sql.DateTime, null);
        requestAuth.input('LastLogin', sql.DateTime, null);
        await requestAuth.query(`
            INSERT INTO UserAuthentication (
                UserName, PasswordHash, Salt, CreatedAt, FirstName, LastName, SecondLastName, RefSexId, Address, Cellphone, University, UniversityDegree, GraduationDate, Email, Landline, RoleId, SchoolId, DeletedAt, LastLogin
            ) VALUES (
                @UserName, @PasswordHash, @Salt, @CreatedAt, @FirstName, @LastName, @SecondLastName, @RefSexId, @Address, @Cellphone, @University, @UniversityDegree, @GraduationDate, @Email, @Landline, @RoleId, @SchoolId, @DeletedAt, @LastLogin
            )
        `);

        await transaction.commit();
        res.status(200).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error durante la transacción en registrarUsuario:', error);
        res.status(500).json({ error: 'Error al registrar usuario.', details: error.message });
    }
}

async function getRoles(req, res) {
    try {
        const pool = await poolPromise;
        // Excluir el rol Student (RoleId = 6)
        const result = await pool.request().query('SELECT * FROM Role WHERE RoleId <> 6');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ error: 'Error al obtener roles.' });
    }
}

// Obtener colegio por ID
async function getColegioById(req, res) {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('OrganizationId', sql.Int, id)
            .query('SELECT OrganizationId, Name FROM Organization WHERE OrganizationId = @OrganizationId');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Colegio no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el colegio' });
    }
}

module.exports = {
    registrarUsuario,
    getRoles,
    getColegioById
}; 
const sql = require('mssql');
const { poolPromise } = require('../config/db');
const bcrypt = require('bcryptjs'); 




// Obtener profesores según el colegio seleccionado
const getProfesoresPorColegio = async (req, res) => {
  const { colegioId } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
        SELECT 
          P.PersonId,
          P.FirstName,
          P.LastName
        FROM 
          Person P
        INNER JOIN 
          OrganizationPersonRole OPR ON P.PersonId = OPR.PersonId
        WHERE 
          OPR.OrganizationId = @colegioId
          AND OPR.RoleId = 5
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    res.status(500).json({ message: 'Error al obtener profesores', error: error.message });
  }
};



async function registrarProfesor(req, res) {
    let transaction;
    try {
        const { 
            nombreUsuario, clave, nombres, apellidoPaterno, apellidoMaterno, direccion, celular,
            universidad, tituloUniversitario, fechaTitulacion, sexo, rut, correo, telefonoFijo, rol,
            colegio // Asegúrate de recibir esto desde el frontend si varía
        } = req.body;

        console.log('Datos recibidos:', req.body);

        // Generar un salt único para cada usuario
        const salt = await bcrypt.genSalt(10);
        const hashedClave = await bcrypt.hash(clave, salt);
        console.log('Contraseña hasheada correctamente.');
        console.log('Salt generado:', salt);

        const pool = await poolPromise;  
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log('Transacción iniciada.');

        // Insertar en la tabla Person
        const requestPerson = new sql.Request(transaction);
        requestPerson.input('FirstName', sql.NVarChar, nombres);
        requestPerson.input('LastName', sql.NVarChar, apellidoPaterno);
        requestPerson.input('SecondLastName', sql.NVarChar, apellidoMaterno);
        requestPerson.input('RefSexId', sql.Int, sexo);

        const resultPerson = await requestPerson.query(`
            INSERT INTO Person (FirstName, LastName, SecondLastName, RefSexId)
            OUTPUT inserted.PersonID
            VALUES (@FirstName, @LastName, @SecondLastName, @RefSexId)
        `);
        if (resultPerson.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar la persona.');
        }
        const personId = resultPerson.recordset[0].PersonID;
        console.log('Persona insertada con ID:', personId);

        // Insertar el correo en PersonEmailAddress
        const requestEmail = new sql.Request(transaction);
        requestEmail.input('PersonId', sql.Int, personId);
        requestEmail.input('EmailAddress', sql.NVarChar, correo);
        const resultEmail = await requestEmail.query(`
            INSERT INTO PersonEmailAddress (PersonId, EmailAddress)
            VALUES (@PersonId, @EmailAddress)
        `);
        if (resultEmail.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar el correo.');
        }
        console.log('Correo insertado.');

        // Insertar la dirección en PersonAddress
        const requestAddress = new sql.Request(transaction);
        requestAddress.input('PersonId', sql.Int, personId);
        requestAddress.input('StreetNumberAndName', sql.NVarChar, direccion);
        const resultAddress = await requestAddress.query(`
            INSERT INTO PersonAddress (PersonId, StreetNumberAndName, RefPersonLocationTypeId)
            VALUES (@PersonId, @StreetNumberAndName, 7)
        `);
        if (resultAddress.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar la dirección.');
        }
        console.log('Dirección insertada.');

        // Insertar el teléfono fijo en PersonTelephone
        const requestPhone = new sql.Request(transaction);
        requestPhone.input('PersonId', sql.Int, personId);
        requestPhone.input('TelephoneNumber', sql.NVarChar, telefonoFijo);
        const resultPhone = await requestPhone.query(`
            INSERT INTO PersonTelephone (PersonId, TelephoneNumber)
            VALUES (@PersonId, @TelephoneNumber)
        `);
        if (resultPhone.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar el teléfono fijo.');
        }
        console.log('Teléfono fijo insertado.');

        // Insertar el celular en PersonTelephone
        const requestMobile = new sql.Request(transaction);
        requestMobile.input('PersonId', sql.Int, personId);
        requestMobile.input('TelephoneNumber', sql.NVarChar, celular);
        const resultMobile = await requestMobile.query(`
            INSERT INTO PersonTelephone (PersonId, TelephoneNumber)
            VALUES (@PersonId, @TelephoneNumber)
        `);
        if (resultMobile.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar el celular.');
        }
        console.log('Celular insertado.');

        // Insertar la universidad y título en PersonDegreeOrCertificate
        const requestDegree = new sql.Request(transaction);
        requestDegree.input('PersonId', sql.Int, personId);
        requestDegree.input('NameOfInstitution', sql.NVarChar, universidad);
        requestDegree.input('DegreeOrCertificateTitleOrSubject', sql.NVarChar, tituloUniversitario);
        requestDegree.input('AwardDate', sql.Date, fechaTitulacion);
        requestDegree.input('RefDegreeOrCertificateTypeId', sql.Int, 1);

        const resultDegree = await requestDegree.query(`
            INSERT INTO PersonDegreeOrCertificate (PersonId, NameOfInstitution, DegreeOrCertificateTitleOrSubject, AwardDate, RefDegreeOrCertificateTypeId)
            VALUES (@PersonId, @NameOfInstitution, @DegreeOrCertificateTitleOrSubject, @AwardDate, @RefDegreeOrCertificateTypeId)
        `);
        if (resultDegree.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar el título universitario.');
        }
        console.log('Título universitario insertado.');

        // Insertar la autenticación en UserAuthentication
        const requestAuth = new sql.Request(transaction);
        requestAuth.input('PersonId', sql.Int, personId);
        requestAuth.input('UserName', sql.NVarChar, nombreUsuario);
        requestAuth.input('PasswordHash', sql.NVarChar, hashedClave);
        requestAuth.input('Salt', sql.NVarChar, salt);

        const resultAuth = await requestAuth.query(`
            INSERT INTO UserAuthentication (PersonId, UserName, PasswordHash, Salt)
            VALUES (@PersonId, @UserName, @PasswordHash, @Salt)
        `);
        if (resultAuth.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar la autenticación.');
        }
        console.log('Autenticación insertada.');

        // Insertar en OrganizationPersonRole con el rol y organizationId
        const requestOrgPersonRole = new sql.Request(transaction);
        requestOrgPersonRole.input('PersonId', sql.Int, personId);
        requestOrgPersonRole.input('RoleID', sql.Int, rol); 
        requestOrgPersonRole.input('OrganizationId', sql.Int, colegio); // Se agrega organizationId

        const resultOrgPersonRole = await requestOrgPersonRole.query(`
            INSERT INTO OrganizationPersonRole (PersonId, RoleID, OrganizationId)
            VALUES (@PersonId, @RoleID, @OrganizationId)
        `);
        if (resultOrgPersonRole.rowsAffected[0] === 0) {
            throw new Error('No se pudo insertar el rol.');
        }
        console.log('Rol insertado.');

        await transaction.commit();
        res.status(200).json({ message: 'Profesor registrado exitosamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error durante la transacción:', error);
        res.status(500).json({ error: 'Error al registrar profesor.', details: error.message });
    }
}

module.exports = {
    registrarProfesor ,
    getProfesoresPorColegio
};

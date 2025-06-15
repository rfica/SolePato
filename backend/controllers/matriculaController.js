// backend/controllers/matriculaController.js

const { poolPromise } = require('../config/db');
const sql = require('mssql');
const path = require('path');
const bcrypt = require('bcryptjs');



// backend/controllers/matriculaController.js

exports.getCursoOptions = async (req, res) => {
    const { colegioId } = req.params; // Obtener colegioId desde los parámetros de la ruta

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('colegioId', sql.Int, colegioId) // Usar el colegioId recibido
            .query(`
                WITH RecursiveCTE AS (
                    -- CTE recursiva para recorrer la jerarquía desde el colegio
                    SELECT 
                        O.OrganizationId, 
                        O.Name, 
                        ORel.OrganizationId AS ChildOrganizationId, 
                        ORel.Parent_OrganizationId
                    FROM 
                        Organization O
                    INNER JOIN 
                        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
                    WHERE 
                        O.OrganizationId = @colegioId

                    UNION ALL

                    SELECT 
                        O.OrganizationId, 
                        O.Name, 
                        ORel.OrganizationId AS ChildOrganizationId, 
                        ORel.Parent_OrganizationId
                    FROM 
                        Organization O
                    INNER JOIN 
                        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
                    INNER JOIN 
                        RecursiveCTE R ON ORel.Parent_OrganizationId = R.ChildOrganizationId
                ),

                GradosConLetras AS (
                    SELECT 
                        R.Name AS CodigoEnseñanzaName, 
                        Grado.Name AS GradoName, 
                        Letra.Name AS LetraName,
                        Letra.OrganizationId AS OrganizationId -- OrganizationId para cursos con letras
                    FROM 
                        RecursiveCTE R
                    INNER JOIN 
                        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
                    INNER JOIN 
                        RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
                    LEFT JOIN 
                        OrganizationRelationship ORelLetras ON Grado.OrganizationId = ORelLetras.Parent_OrganizationId
                    LEFT JOIN 
                        Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
                    LEFT JOIN 
                        RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
                        AND ROT_Letra.RefOrganizationElementTypeId = 21 -- Tipo de elemento para letras
                    WHERE 
                        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grado
                        AND ROT_Letra.RefOrganizationTypeId IS NOT NULL -- Solo grados que tienen letras
                ),

                GradosSinLetras AS (
                    SELECT 
                        R.Name AS CodigoEnseñanzaName, 
                        Grado.Name AS GradoName, 
                        NULL AS LetraName,
                        Grado.OrganizationId AS OrganizationId -- OrganizationId para cursos sin letras
                    FROM 
                        RecursiveCTE R
                    INNER JOIN 
                        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
                    INNER JOIN 
                        RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
                    WHERE 
                        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grado
                        AND NOT EXISTS (
                            SELECT 1
                            FROM OrganizationRelationship ORelLetras
                            JOIN Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
                            JOIN RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
                            WHERE ORelLetras.Parent_OrganizationId = Grado.OrganizationId
                              AND ROT_Letra.RefOrganizationElementTypeId = 21 -- Solo letras válidas
                        )
                )

                -- Unión final de ambas consultas
                SELECT 
                    CodigoEnseñanzaName, 
                    GradoName, 
                    LetraName, 
                    OrganizationId -- Columna OrganizationId para identificar el grado o letra
                FROM GradosConLetras
                UNION ALL
                SELECT 
                    CodigoEnseñanzaName, 
                    GradoName, 
                    LetraName, 
                    OrganizationId -- Columna OrganizationId para identificar el grado o letra
                FROM GradosSinLetras
                ORDER BY 
                    CodigoEnseñanzaName, GradoName, LetraName;
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de curso:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de curso' });
    }
};





exports.getNivelesPorColegio = async (req, res) => {
  const { colegioId } = req.params; // ID del colegio

  const query = `
    WITH RecursiveHierarchy AS (
        SELECT
            o.OrganizationId,
            o.Name,
            o.RefOrganizationTypeId,
            orl.Parent_OrganizationId
        FROM
            Organization o
        INNER JOIN
            OrganizationRelationship orl
        ON
            o.OrganizationId = orl.OrganizationId
        WHERE
            orl.Parent_OrganizationId = @colegioId
        
        UNION ALL
        
        SELECT
            o.OrganizationId,
            o.Name,
            o.RefOrganizationTypeId,
            orl.Parent_OrganizationId
        FROM
            Organization o
        INNER JOIN
            OrganizationRelationship orl
        ON
            o.OrganizationId = orl.OrganizationId
        INNER JOIN
            RecursiveHierarchy rh
        ON
            rh.OrganizationId = orl.Parent_OrganizationId
    )
    SELECT
        rh.OrganizationId,
        rh.Name,
        r.Description AS OrganizationType
    FROM
        RecursiveHierarchy rh
    INNER JOIN
        RefOrganizationType r
    ON
        rh.RefOrganizationTypeId = r.RefOrganizationTypeId
    WHERE
        r.RefOrganizationElementTypeId = 40;
  `;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error al obtener niveles:", error);
    res.status(500).json({ error: "Error al obtener niveles." });
  }
};





// Controlador para crear estudiante y subir el documento
exports.createStudent = async (req, res) => {
    const {
        // -----------------------------
        // EXISTENTE: Campos existentes
        // -----------------------------
        numeroCorrelativo, rutIpe, run, ipe, primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno, sexo,
        fechaNacimiento, nivel, curso, fechaMatricula, fechaRetiro, motivoRetiro, domicilio, observaciones,
        presedencia, docIdentidad, comuna, region,
        // -----------------------------
        // NUEVO: Campos adicionales
        // -----------------------------
        // Grupo de Datos: Datos Escolares
        localEscolar, tipoMatricula, numeroResolucion, fechaResolucion,
        // Grupo de Datos: Datos Biológicos y Salud
        enfermedadId, alergiaId, reaccionDescripcion, grupoSanguineoId, sistemaSaludId,
        // Otros campos nuevos
        tipoEstudiante, otroDatoInteres,


       // NUEVO: Campos adicionales 
    viveCon,  // 'Padres', 'Padre', 'Madre' o 'Apoderado'
    
    // Campos del Padre
    primerNombrePadre, segundoNombrePadre, apellidoPaternoPadre, apellidoMaternoPadre,
    domicilioPadre, telefonoPadre, emailPadre, nivelEducacionalPadre,

    // Campos de la Madre
    primerNombreMadre, segundoNombreMadre, apellidoPaternoMadre, apellidoMaternoMadre,
    domicilioMadre, telefonoMadre, emailMadre, nivelEducacionalMadre,

    // Campos del Apoderado (si corresponde)
    primerNombreApoderado, segundoNombreApoderado, apellidoPaternoApoderado, apellidoMaternoApoderado,
    domicilioApoderado, telefonoApoderado, emailApoderado,

    // NUEVO: Campos adicionales 
    rutOipeApoderadoTipo,
    rutOipeApoderado




    } = req.body;

    const selectedColegio = req.body.selectedColegio || req.params.selectedColegio || null; // Asegúrate de que el valor esté disponible

    if (!selectedColegio) {
        return res.status(400).json({ error: 'El colegio seleccionado es obligatorio.' });
    }

    // Obtener el archivo de resolución si existe
    const archivoResolucion = req.file; // Asegúrate de que en las rutas tengas configurado multer para manejar 'archivoResolucion'

    // Agregar logs iniciales
    console.log('--- Iniciando creación de estudiante ---');

    console.log('Datos recibidos:', req.body);

   // Agregar log para tipoMatricula
    console.log('Valor de tipoMatricula recibido:', tipoMatricula);

    // Agregar log para tipoEstudiante
    console.log('Valores de tipoEstudiante recibidos:', tipoEstudiante);


    if (archivoResolucion) {
        console.log('Archivo de resolución recibido:', archivoResolucion.filename);
    } else {
        console.log('No se recibió ningún archivo de resolución.');
    }

    try {
        const pool = await poolPromise;
        console.log('Conexión a la base de datos establecida.');

	const runIpeValue = rutIpe === 'RUN' ? run : ipe;
        // Prueba directa a UserAuthentication al inicio del endpoint
        try {
            const test = await pool.request().query('SELECT TOP 1 * FROM UserAuthentication');
            console.log('Consulta directa a UserAuthentication OK:', test.recordset.length);
        } catch (err) {
            console.error('Error en consulta directa a UserAuthentication:', err);
        }

        // Prueba de consulta de existencia sin LOWER
        let usuarioExiste = false;
        if (runIpeValue) {
            try {
                const checkUser = await pool.request()
                    .input('UserName', sql.NVarChar, runIpeValue)
                    .query('SELECT * FROM UserAuthentication WHERE UserName = @UserName');
                console.log('Resultado de búsqueda de usuario existente (sin LOWER):', checkUser.recordset.length);
                usuarioExiste = checkUser.recordset.length > 0;
            } catch (err) {
                console.error('Error en consulta de existencia de usuario (sin LOWER):', err);
            }
        }

        // VALIDACIÓN: Verificar si el RUT del estudiante ya existe con matrícula activa en el mismo año
        const anioMatricula = new Date(fechaMatricula).getFullYear();
        const checkRutQuery = `
            SELECT pi.PersonId
            FROM PersonIdentifier pi
            INNER JOIN PersonStatus ps ON pi.PersonId = ps.PersonId
            WHERE pi.Identifier = @Identifier
              AND ps.RefPersonStatusTypeId = 30 -- Matrícula
              AND YEAR(ps.StatusStartDate) = @AnioMatricula
              AND (ps.StatusEndDate IS NULL OR YEAR(ps.StatusEndDate) = @AnioMatricula)
        `;
        const checkRutRequest = new sql.Request(pool);
        checkRutRequest.input('Identifier', sql.VarChar, rutIpe === 'RUN' ? run : ipe);
        checkRutRequest.input('AnioMatricula', sql.Int, anioMatricula);
        const checkRutResult = await checkRutRequest.query(checkRutQuery);
        if (checkRutResult.recordset.length > 0) {
            return res.status(400).json({ error: 'El estudiante ya tiene una matrícula vigente en este año. No se puede registrar nuevamente.' });
        }

        const checkQuery = `
  	SELECT ps.PersonId
  	FROM PersonIdentifier pi
  	INNER JOIN PersonStatus ps ON pi.PersonId = ps.PersonId
  	WHERE pi.Identifier = @Identifier
   	 AND pi.RefPersonIdentificationSystemId = @IdSystem
   	 AND ps.RefPersonStatusTypeId = 30 -- Matrícula
    	AND ps.StatusEndDate IS NULL
	`;


	const checkRequest = new sql.Request(pool);


	checkRequest.input('Identifier', sql.VarChar, runIpeValue);
	checkRequest.input('IdSystem', sql.Int, rutIpe === 'RUN' ? 51 : 52);

	const checkResult = await checkRequest.query(checkQuery);

	if (checkResult.recordset.length > 0) {
 	 return res.status(400).json({ error: 'El estudiante ya tiene una matrícula vigente. No se puede registrar nuevamente.' });
	}





        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        console.log('Transacción iniciada.');

        try {
            // -----------------------------
            // EXISTENTE: Insertar en Person
            // -----------------------------
            console.log('Insertando datos en la tabla Person...');
            const requestPerson = new sql.Request(transaction);
            requestPerson.input('FirstName', sql.VarChar, primerNombre);
            requestPerson.input('MiddleName', sql.VarChar, segundoNombre);
            requestPerson.input('LastName', sql.VarChar, apellidoPaterno);
            requestPerson.input('SecondLastName', sql.VarChar, apellidoMaterno);
            requestPerson.input('RefSexId', sql.Int, sexo);
            requestPerson.input('Birthdate', sql.Date, fechaNacimiento);

            requestPerson.input('RecordStartDateTime', sql.DateTime, fechaMatricula || new Date());
            requestPerson.input('RecordEndDateTime', sql.DateTime, fechaRetiro || null);
   

            const personResult = await requestPerson.query(`
                INSERT INTO Person (
  		FirstName, MiddleName, LastName, SecondLastName, RefSexId, Birthdate,
  		RecordStartDateTime, RecordEndDateTime
			)
		OUTPUT INSERTED.PersonId
			VALUES (
  			@FirstName, @MiddleName, @LastName, @SecondLastName, @RefSexId, @Birthdate,
  			@RecordStartDateTime, @RecordEndDateTime
			)

            `);

            if (personResult.recordset.length === 0) {
                throw new Error('No se pudo obtener el PersonId después de insertar en Person.');
            }

            const personId = personResult.recordset[0].PersonId;
            console.log(`Persona creada con ID: ${personId}`);


          // -----------------------------------
      // Insertar los datos del Padre
      // -----------------------------------
      const requestPadre = new sql.Request(transaction);
      requestPadre.input('FirstName', sql.VarChar, primerNombrePadre);
      requestPadre.input('MiddleName', sql.VarChar, segundoNombrePadre);
      requestPadre.input('LastName', sql.VarChar, apellidoPaternoPadre);
      requestPadre.input('SecondLastName', sql.VarChar, apellidoMaternoPadre);
      
      const padreResult = await requestPadre.query(`
        INSERT INTO Person (FirstName, MiddleName, LastName, SecondLastName)
        OUTPUT INSERTED.PersonId
        VALUES (@FirstName, @MiddleName, @LastName, @SecondLastName)
      `);
      const padrePersonId = padreResult.recordset[0].PersonId;

      // Insertar el domicilio del Padre en PersonAddress
      const requestPadreAddress = new sql.Request(transaction);
      requestPadreAddress.input('PersonId', sql.Int, padrePersonId);
      requestPadreAddress.input('StreetNumberAndName', sql.VarChar, domicilioPadre);
      await requestPadreAddress.query(`
        INSERT INTO PersonAddress (PersonId, StreetNumberAndName,RefPersonLocationTypeId)
        VALUES (@PersonId, @StreetNumberAndName,9)
      `);

      // Insertar el teléfono del Padre en PersonTelephone
      if (telefonoPadre) {
        const requestPadrePhone = new sql.Request(transaction);
        requestPadrePhone.input('PersonId', sql.Int, padrePersonId);
        requestPadrePhone.input('TelephoneNumber', sql.VarChar, telefonoPadre);
        await requestPadrePhone.query(`
          INSERT INTO PersonTelephone (PersonId, TelephoneNumber)
          VALUES (@PersonId, @TelephoneNumber)
        `);
      }

      // Insertar el email del Padre en PersonEmailAddress
      if (emailPadre) {
        const requestPadreEmail = new sql.Request(transaction);
        requestPadreEmail.input('PersonId', sql.Int, padrePersonId);
        requestPadreEmail.input('EmailAddress', sql.VarChar, emailPadre);
        await requestPadreEmail.query(`
          INSERT INTO PersonEmailAddress (PersonId, EmailAddress)
          VALUES (@PersonId, @EmailAddress)
        `);
      }

      // Insertar el nivel educacional del Padre en PersonDegreeOrCertificate
      if (nivelEducacionalPadre && !isNaN(Number(nivelEducacionalPadre))) {
        const requestPadreDegree = new sql.Request(transaction);
        requestPadreDegree.input('PersonId', sql.Int, padrePersonId);
        requestPadreDegree.input('RefDegreeOrCertificateTypeId', sql.Int, nivelEducacionalPadre);
        await requestPadreDegree.query(`
          INSERT INTO PersonDegreeOrCertificate (PersonId, RefDegreeOrCertificateTypeId)
          VALUES (@PersonId, @RefDegreeOrCertificateTypeId)
        `);
      }




    // Crear la relación de Padre en PersonRelationship
                const requestPadreRelationship = new sql.Request(transaction);
		requestPadreRelationship.input('PersonId', sql.Int, padrePersonId);
		requestPadreRelationship.input('RelatedPersonId', sql.Int, personId); // ID del estudiante
		requestPadreRelationship.input('RefPersonRelationshipId', sql.Int, 8); // 8 = Padre

	// Condicional para actualizar LivesWithIndicator
		const viveConPadre = (viveCon === 'Padres' || viveCon === 'Padre') ? 1 : 0;
		requestPadreRelationship.input('LivesWithIndicator', sql.Bit, viveConPadre);

		await requestPadreRelationship.query(`
  		INSERT INTO PersonRelationship (PersonId, RelatedPersonId, RefPersonRelationshipId, LivesWithIndicator)
  		VALUES (@PersonId, @RelatedPersonId, @RefPersonRelationshipId, @LivesWithIndicator)
		`);




      // -----------------------------------
      // Insertar los datos de la Madre
      // -----------------------------------
      const requestMadre = new sql.Request(transaction);
      requestMadre.input('FirstName', sql.VarChar, primerNombreMadre);
      requestMadre.input('MiddleName', sql.VarChar, segundoNombreMadre);
      requestMadre.input('LastName', sql.VarChar, apellidoPaternoMadre);
      requestMadre.input('SecondLastName', sql.VarChar, apellidoMaternoMadre);
      
      const madreResult = await requestMadre.query(`
        INSERT INTO Person (FirstName, MiddleName, LastName, SecondLastName)
        OUTPUT INSERTED.PersonId
        VALUES (@FirstName, @MiddleName, @LastName, @SecondLastName)
      `);
      const madrePersonId = madreResult.recordset[0].PersonId;

      // Insertar el domicilio de la Madre en PersonAddress
      const requestMadreAddress = new sql.Request(transaction);
      requestMadreAddress.input('PersonId', sql.Int, madrePersonId);
      requestMadreAddress.input('StreetNumberAndName', sql.VarChar, domicilioMadre);
      await requestMadreAddress.query(`
        INSERT INTO PersonAddress (PersonId, StreetNumberAndName,RefPersonLocationTypeId)
        VALUES (@PersonId, @StreetNumberAndName,10)
      `);

      // Insertar el teléfono de la Madre en PersonTelephone
      if (telefonoMadre) {
        const requestMadrePhone = new sql.Request(transaction);
        requestMadrePhone.input('PersonId', sql.Int, madrePersonId);
        requestMadrePhone.input('TelephoneNumber', sql.VarChar, telefonoMadre);
        await requestMadrePhone.query(`
          INSERT INTO PersonTelephone (PersonId, TelephoneNumber)
          VALUES (@PersonId, @TelephoneNumber)
        `);
      }

      // Insertar el email de la Madre en PersonEmailAddress
      if (emailMadre) {
        const requestMadreEmail = new sql.Request(transaction);
        requestMadreEmail.input('PersonId', sql.Int, madrePersonId);
        requestMadreEmail.input('EmailAddress', sql.VarChar, emailMadre);
        await requestMadreEmail.query(`
          INSERT INTO PersonEmailAddress (PersonId, EmailAddress)
          VALUES (@PersonId, @EmailAddress)
        `);
      }

      // Insertar el nivel educacional de la Madre en PersonDegreeOrCertificate
      if (nivelEducacionalMadre && !isNaN(Number(nivelEducacionalMadre))) {
        const requestMadreDegree = new sql.Request(transaction);
        requestMadreDegree.input('PersonId', sql.Int, madrePersonId);
        requestMadreDegree.input('RefDegreeOrCertificateTypeId', sql.Int, nivelEducacionalMadre);
        await requestMadreDegree.query(`
          INSERT INTO PersonDegreeOrCertificate (PersonId, RefDegreeOrCertificateTypeId)
          VALUES (@PersonId, @RefDegreeOrCertificateTypeId)
        `);
      }


      // Crear la relación de Madre en PersonRelationship
		const requestMadreRelationship = new sql.Request(transaction);
		requestMadreRelationship.input('PersonId', sql.Int, madrePersonId);
		requestMadreRelationship.input('RelatedPersonId', sql.Int, personId); // ID del estudiante
		requestMadreRelationship.input('RefPersonRelationshipId', sql.Int, 19); // 19 = Madre

	// Condicional para actualizar LivesWithIndicator
		const viveConMadre = (viveCon === 'Padres' || viveCon === 'Madre') ? 1 : 0;
		requestMadreRelationship.input('LivesWithIndicator', sql.Bit, viveConMadre);

		await requestMadreRelationship.query(`
 		 INSERT INTO PersonRelationship (PersonId, RelatedPersonId, RefPersonRelationshipId, LivesWithIndicator)
 		 VALUES (@PersonId, @RelatedPersonId, @RefPersonRelationshipId, @LivesWithIndicator)
		`);





      // -----------------------------------
      // Insertar los datos del Apoderado si corresponde
      // -----------------------------------
      if (viveCon === 'Apoderado') {
        console.log('--- INICIO bloque apoderado ---');
        console.log('Datos apoderado:', {
          primerNombreApoderado, segundoNombreApoderado, apellidoPaternoApoderado, apellidoMaternoApoderado,
          domicilioApoderado, telefonoApoderado, emailApoderado, rutOipeApoderadoTipo, rutOipeApoderado
        });

        console.log('Insertando apoderado en Person...');
        const requestApoderado = new sql.Request(transaction);
        requestApoderado.input('FirstName', sql.VarChar, primerNombreApoderado);
        requestApoderado.input('MiddleName', sql.VarChar, segundoNombreApoderado);
        requestApoderado.input('LastName', sql.VarChar, apellidoPaternoApoderado);
        requestApoderado.input('SecondLastName', sql.VarChar, apellidoMaternoApoderado);
        const apoderadoResult = await requestApoderado.query(`
          INSERT INTO Person (FirstName, MiddleName, LastName, SecondLastName)
          OUTPUT INSERTED.PersonId
          VALUES (@FirstName, @MiddleName, @LastName, @SecondLastName)
        `);
        const apoderadoPersonId = apoderadoResult.recordset[0].PersonId;
        console.log('Apoderado creado con ID:', apoderadoPersonId);

        console.log('Insertando dirección apoderado...');
        const requestApoderadoAddress = new sql.Request(transaction);
        requestApoderadoAddress.input('PersonId', sql.Int, apoderadoPersonId);
        requestApoderadoAddress.input('StreetNumberAndName', sql.VarChar, domicilioApoderado);
        await requestApoderadoAddress.query(`
          INSERT INTO PersonAddress (PersonId, StreetNumberAndName,RefPersonLocationTypeId)
          VALUES (@PersonId, @StreetNumberAndName,18)
        `);
        console.log('Dirección apoderado insertada.');

        // Insertar el teléfono del Apoderado en PersonTelephone
        if (telefonoApoderado) {
          const requestApoderadoPhone = new sql.Request(transaction);
          requestApoderadoPhone.input('PersonId', sql.Int, apoderadoPersonId);
          requestApoderadoPhone.input('TelephoneNumber', sql.VarChar, telefonoApoderado);
          await requestApoderadoPhone.query(`
            INSERT INTO PersonTelephone (PersonId, TelephoneNumber)
            VALUES (@PersonId, @TelephoneNumber)
          `);
        }

        // Insertar el email del Apoderado en PersonEmailAddress
        if (emailApoderado) {
          const requestApoderadoEmail = new sql.Request(transaction);
          requestApoderadoEmail.input('PersonId', sql.Int, apoderadoPersonId);
          requestApoderadoEmail.input('EmailAddress', sql.VarChar, emailApoderado);
          await requestApoderadoEmail.query(`
            INSERT INTO PersonEmailAddress (PersonId, EmailAddress)
            VALUES (@PersonId, @EmailAddress)
          `);
        }

        // Crear la relación de Apoderado en PersonRelationship
        const requestApoderadoRelationship = new sql.Request(transaction);
        requestApoderadoRelationship.input('PersonId', sql.Int, apoderadoPersonId);
        requestApoderadoRelationship.input('RelatedPersonId', sql.Int, personId); // ID del estudiante
        requestApoderadoRelationship.input('RefPersonRelationshipId', sql.Int, 31); // 31 = Apoderado
        requestApoderadoRelationship.input('LivesWithIndicator', sql.Bit, 1); // Vive con Apoderado
        await requestApoderadoRelationship.query(`
          INSERT INTO PersonRelationship (PersonId, RelatedPersonId, RefPersonRelationshipId, LivesWithIndicator)
          VALUES (@PersonId, @RelatedPersonId, @RefPersonRelationshipId, @LivesWithIndicator)
        `);
        console.log('Relación apoderado-estudiante insertada.');

        // --- Guardar RUT o IPE del apoderado en PersonIdentifier y UserAuthentication ---
        if (rutOipeApoderado && rutOipeApoderadoTipo) {
          console.log('Insertando RUT/IPE apoderado en PersonIdentifier:', rutOipeApoderado, rutOipeApoderadoTipo);
          const requestIdentifierApoderado = new sql.Request(transaction);
          requestIdentifierApoderado.input('PersonId', sql.Int, apoderadoPersonId);
          requestIdentifierApoderado.input('Identifier', sql.VarChar, rutOipeApoderado);
          requestIdentifierApoderado.input('RefPersonIdentificationSystemId', sql.Int, rutOipeApoderadoTipo === 'RUN' ? 51 : 52);
          requestIdentifierApoderado.input('RecordStartDateTime', sql.DateTime, fechaMatricula || new Date());
          requestIdentifierApoderado.input('RecordEndDateTime', sql.DateTime, null);
          await requestIdentifierApoderado.query(`
            INSERT INTO PersonIdentifier (PersonId, Identifier, RefPersonIdentificationSystemId, RecordStartDateTime, RecordEndDateTime)
            VALUES (@PersonId, @Identifier, @RefPersonIdentificationSystemId, @RecordStartDateTime, @RecordEndDateTime)
          `);
          console.log('RUT/IPE apoderado insertado en PersonIdentifier.');
        }
        console.log('--- FIN bloque apoderado ---');
    }



            // -----------------------------
            // EXISTENTE: Insertar en PersonIdentifier
            // -----------------------------
            console.log('Insertando datos en la tabla PersonIdentifier...');
            const requestIdentifier = new sql.Request(transaction);
            requestIdentifier.input('PersonId', sql.Int, personId);
            requestIdentifier.input('Identifier', sql.VarChar, rutIpe === 'RUN' ? run : ipe);
            requestIdentifier.input('RefPersonIdentificationSystemId', sql.Int, rutIpe === 'RUN' ? 51 : 52);
            requestIdentifier.input('RecordStartDateTime', sql.DateTime, fechaMatricula || new Date());
	    requestIdentifier.input('RecordEndDateTime', sql.DateTime, fechaRetiro || null);
 

            await requestIdentifier.query(`
                INSERT INTO PersonIdentifier (PersonId, Identifier, RefPersonIdentificationSystemId, RecordStartDateTime, RecordEndDateTime)
                VALUES (@PersonId, @Identifier, @RefPersonIdentificationSystemId,@RecordStartDateTime, @RecordEndDateTime)
            `);
            console.log('Datos insertados en PersonIdentifier.');

            // EXISTENTE: Si es IPE, insertar documento de identidad
            if (rutIpe === 'IPE') {
                console.log('Insertando datos en PersonIdentifier para IPE...');
                const requestDocIdentidad = new sql.Request(transaction);
                requestDocIdentidad.input('PersonId', sql.Int, personId);
                requestDocIdentidad.input('Identifier', sql.VarChar, docIdentidad);
                requestDocIdentidad.input('RefPersonIdentificationSystemId', sql.Int, 52);

                await requestDocIdentidad.query(`
                    INSERT INTO PersonIdentifier (PersonId, Identifier, RefPersonIdentificationSystemId)
                    VALUES (@PersonId, @Identifier, @RefPersonIdentificationSystemId)
                `);
                console.log('Datos de documento de identidad insertados para IPE.');
            }

            // -----------------------------
            // NUEVO: Insertar en PersonStatus (Tipo Matrícula)
            // Grupo de Datos: Datos Escolares
            // -----------------------------
            if (tipoMatricula) {
                console.log('Insertando datos en PersonStatus para Tipo Matrícula...');
                const requestTipoMatricula = new sql.Request(transaction);
                requestTipoMatricula.input('PersonId', sql.Int, personId);
                requestTipoMatricula.input('RefPersonStatusTypeId', sql.Int, tipoMatricula);
                requestTipoMatricula.input('RecordStartDateTime', sql.DateTime, fechaMatricula || new Date());
		requestTipoMatricula.input('RecordEndDateTime', sql.DateTime, fechaRetiro || null);


                await requestTipoMatricula.query(`
                    INSERT INTO PersonStatus (PersonId, RefPersonStatusTypeId,StatusValue, RecordStartDateTime, RecordEndDateTime)
                    VALUES (@PersonId, @RefPersonStatusTypeId,1, @RecordStartDateTime, @RecordEndDateTime)
                `);
                console.log('Datos de Tipo Matrícula insertados en PersonStatus.');
            }

            // -----------------------------
            // NUEVO: Insertar Tipos de Estudiante seleccionados
            // Grupo de Datos: Datos Escolares
            // -----------------------------
            if (tipoEstudiante) {
    			console.log('Insertando Tipos de Estudiante en PersonStatus...');
    
    				console.log('Tipos de Estudiante a insertar:', tipoEstudiante); // Usamos directamente tipoEstudiante

    		for (const tipoId of tipoEstudiante) {
       			 console.log(`Insertando Tipo de Estudiante con ID: ${tipoId}`);
       			 const requestTipoEstudiante = new sql.Request(transaction);
       			 requestTipoEstudiante.input('PersonId', sql.Int, personId);
      			  requestTipoEstudiante.input('RefPersonStatusTypeId', sql.Int, tipoId);
      			  await requestTipoEstudiante.query(`
       			     INSERT INTO PersonStatus (PersonId, RefPersonStatusTypeId,StatusValue)
        			    VALUES (@PersonId, @RefPersonStatusTypeId,1, @RecordStartDateTime, @RecordEndDateTime)
       										 `);
        		console.log(`Tipo de Estudiante con ID ${tipoId} insertado.`);
    		}
		}

            // -----------------------------
            // NUEVO: Insertar Número y Fecha de Resolución si corresponde
            // Grupo de Datos: Datos Escolares
            // -----------------------------
            if ((numeroResolucion && fechaResolucion) || archivoResolucion) {
                console.log('Insertando documento en la tabla Document...');
                const requestDocument = new sql.Request(transaction);
                requestDocument.input('Description', sql.VarChar, 'Resolución');
                requestDocument.input('RutaArchivo', sql.VarChar, archivoResolucion ? archivoResolucion.filename : null);
                requestDocument.input('RecordStartDateTime', sql.DateTime, fechaResolucion || new Date());

                const documentResult = await requestDocument.query(`
                    INSERT INTO Document (Description,fileScanBase64, RutaArchivo, RecordStartDateTime)
                    OUTPUT INSERTED.DocumentId
                    VALUES (@Description, 'prueba',  @RutaArchivo, @RecordStartDateTime)
                `);

                if (documentResult.recordset.length === 0) {
                    throw new Error('No se pudo obtener el DocumentId después de insertar en Document.');
                }

                const documentId = documentResult.recordset[0].DocumentId;
                console.log(`Documento creado con ID: ${documentId}`);

                console.log('Actualizando PersonStatus con DocumentId...');
                const requestUpdatePersonStatus = new sql.Request(transaction);
                requestUpdatePersonStatus.input('PersonId', sql.Int, personId);
                requestUpdatePersonStatus.input('DocumentId', sql.Int, documentId);
                requestUpdatePersonStatus.input('DocNumber', sql.VarChar, numeroResolucion || null);
                requestUpdatePersonStatus.input('StatusStartDate', sql.DateTime, fechaResolucion || new Date());

                await requestUpdatePersonStatus.query(`
                    UPDATE PersonStatus
                    SET DocumentId = @DocumentId, DocNumber = @DocNumber, StatusStartDate = @StatusStartDate
                    WHERE PersonId = @PersonId AND RefPersonStatusTypeId IN (24, 25, 31) -- IDs correspondientes
                `);
                console.log('PersonStatus actualizado con DocumentId.');
            }

            // -----------------------------
            // NUEVO: Insertar Otro Dato de Interés si corresponde
            // Grupo de Datos: Datos Escolares
            // -----------------------------
            if (otroDatoInteres) {
                console.log('Insertando Otro Dato de Interés en PersonStatus...');
                const requestUpdatePersonStatus = new sql.Request(transaction);
                requestUpdatePersonStatus.input('PersonId', sql.Int, personId);
                requestUpdatePersonStatus.input('Description', sql.VarChar, otroDatoInteres);
                await requestUpdatePersonStatus.query(`
                    UPDATE PersonStatus
                    SET Description = @Description
                    WHERE PersonId = @PersonId AND RefPersonStatusTypeId IN (5, 26) -- IDs correspondientes
                `);
                console.log('Otro Dato de Interés insertado en PersonStatus.');
            }

            // -----------------------------
            // MODIFICADO: Insertar en OrganizationPersonRole SOLO para el curso
            // -----------------------------
            console.log('Insertando datos en OrganizationPersonRole...');
            const requestOrgPersonRole = new sql.Request(transaction);
            requestOrgPersonRole.input('PersonId', sql.Int, personId);
            requestOrgPersonRole.input('OrganizationIdCurso', sql.Int, curso);
            requestOrgPersonRole.input('RoleID', sql.Int, 6);
    
            await requestOrgPersonRole.query(`
                INSERT INTO OrganizationPersonRole (PersonId, OrganizationId, RoleID)
                VALUES (@PersonId, @OrganizationIdCurso, @RoleID)
            `);
            console.log('Datos insertados en OrganizationPersonRole.');

            // -----------------------------
            // EXISTENTE: Insertar en PersonStatus (Matrícula)
            // -----------------------------
            console.log('Insertando datos de Matrícula en PersonStatus...');
            const requestPersonStatus = new sql.Request(transaction);
            requestPersonStatus.input('PersonId', sql.Int, personId);
            requestPersonStatus.input('StatusStartDate', sql.Date, fechaMatricula);



          // Si fechaRetiro está presente, la insertamos, de lo contrario, insertamos NULL
		if (fechaRetiro && fechaRetiro !== '')
                {
   			 requestPersonStatus.input('StatusEndDate', sql.Date, fechaRetiro);
		} else {
   			 requestPersonStatus.input('StatusEndDate', sql.Date, null);
		}




            requestPersonStatus.input('Description', sql.VarChar, motivoRetiro);
            requestPersonStatus.input('RefPersonStatusTypeId', sql.Int, 30);

            await requestPersonStatus.query(`
                INSERT INTO PersonStatus (PersonId, StatusStartDate, StatusEndDate, Description, RefPersonStatusTypeId,StatusValue)
                VALUES (@PersonId, @StatusStartDate, @StatusEndDate, @Description, @RefPersonStatusTypeId,1)
            `);
            console.log('Datos de Matrícula insertados en PersonStatus.');

            // -----------------------------
            // EXISTENTE: Insertar en PersonAddress
            // -----------------------------
            console.log('Insertando datos en PersonAddress...');
            const requestPersonAddress = new sql.Request(transaction);
            requestPersonAddress.input('PersonId', sql.Int, personId);
            requestPersonAddress.input('StreetNumberAndName', sql.VarChar, domicilio);
            requestPersonAddress.input('RefCountyId', sql.Int, comuna);
            requestPersonAddress.input('RefStateId', sql.Int, region);

            await requestPersonAddress.query(`
                INSERT INTO PersonAddress (PersonId, StreetNumberAndName, RefCountyId, RefStateId,RefPersonLocationTypeId)
                VALUES (@PersonId, @StreetNumberAndName, @RefCountyId, @RefStateId,7)
            `);
            console.log('Datos insertados en PersonAddress.');

            // -----------------------------
            // EXISTENTE: Insertar en PersonStatus con presedencia
            // -----------------------------
            console.log('Insertando datos de Presedencia en PersonStatus...');
            const requestPersonStatusPresedencia = new sql.Request(transaction);
            requestPersonStatusPresedencia.input('PersonId', sql.Int, personId);
            requestPersonStatusPresedencia.input('RefPersonStatusTypeId', sql.Int, presedencia);
            requestPersonStatusPresedencia.input('Description', sql.VarChar, observaciones);

            await requestPersonStatusPresedencia.query(`
                INSERT INTO PersonStatus (PersonId, RefPersonStatusTypeId, Description,StatusValue)
                VALUES (@PersonId, @RefPersonStatusTypeId, @Description,1)
            `);
            console.log('Datos de Presedencia insertados en PersonStatus.');

            // -----------------------------
            // NUEVO: Insertar en PersonDisability (Enfermedades)
            // Grupo de Datos: Datos Biológicos y Salud
            // -----------------------------
            console.log('Verificando si se insertará enfermedad:', enfermedadId);
            if (enfermedadId) {
                console.log(`Insertando Enfermedad con ID: ${enfermedadId} en PersonDisability...`);
                const requestPersonDisability = new sql.Request(transaction);
                requestPersonDisability.input('PersonId', sql.Int, personId);
                requestPersonDisability.input('RefDisabilityTypeId', sql.Int, enfermedadId);
                await requestPersonDisability.query(`
                    INSERT INTO PersonDisability (PersonId, PrimaryDisabilityTypeId)
                    VALUES (@PersonId, @RefDisabilityTypeId)
                `);
                console.log('Enfermedad insertada en PersonDisability.');
            } else {
                console.log('No se insertará enfermedad (enfermedadId vacío o nulo)');
            }

            // -----------------------------
            // NUEVO: Insertar en PersonAllergy (Alergias)
            // Grupo de Datos: Datos Biológicos y Salud
            // -----------------------------
            console.log('Verificando si se insertará alergia:', alergiaId);
            if (alergiaId) {
                console.log(`Insertando Alergia con ID: ${alergiaId} en PersonAllergy...`);
                const requestPersonAllergy = new sql.Request(transaction);
                requestPersonAllergy.input('PersonId', sql.Int, personId);
                requestPersonAllergy.input('RefAllergyTypeId', sql.Int, alergiaId);
                requestPersonAllergy.input('ReactionDescription', sql.VarChar, reaccionDescripcion);
                await requestPersonAllergy.query(`
                    INSERT INTO PersonAllergy (PersonId, RefAllergyTypeId, ReactionDescription)
                    VALUES (@PersonId, @RefAllergyTypeId, @ReactionDescription)
                `);
                console.log('Alergia insertada en PersonAllergy.');
            } else {
                console.log('No se insertará alergia (alergiaId vacío o nulo)');
            }

            // -----------------------------
            // NUEVO: Insertar en PersonBlood (Grupo Sanguíneo)
            // Grupo de Datos: Datos Biológicos y Salud
            // -----------------------------
            console.log('Verificando si se insertará grupo sanguíneo:', grupoSanguineoId);
            if (grupoSanguineoId) {
                console.log(`Insertando Grupo Sanguíneo con ID: ${grupoSanguineoId} en PersonBlood...`);
                const requestPersonBlood = new sql.Request(transaction);
                requestPersonBlood.input('PersonId', sql.Int, personId);
                requestPersonBlood.input('RefBloodTypeId', sql.Int, grupoSanguineoId);
                await requestPersonBlood.query(`
                    INSERT INTO PersonBlood (PersonId, RefBloodTypeId)
                    VALUES (@PersonId, @RefBloodTypeId)
                `);
                console.log('Grupo Sanguíneo insertado en PersonBlood.');
            } else {
                console.log('No se insertará grupo sanguíneo (grupoSanguineoId vacío o nulo)');
            }

            // -----------------------------
            // NUEVO: Insertar en PersonHealth (Sistema de Salud)
            // Grupo de Datos: Datos Biológicos y Salud
            // -----------------------------
            console.log('Verificando si se insertará sistema de salud:', sistemaSaludId);
            if (sistemaSaludId) {
                console.log(`Insertando Sistema de Salud con ID: ${sistemaSaludId} en PersonHealth...`);
                const requestPersonHealth = new sql.Request(transaction);
                requestPersonHealth.input('PersonId', sql.Int, personId);
                requestPersonHealth.input('RefHealthInsuranceCoverageId', sql.Int, sistemaSaludId);
                await requestPersonHealth.query(`
                    INSERT INTO PersonHealth (PersonId, RefHealthInsuranceCoverageId,DentalScreeningDate)
                    VALUES (@PersonId, @RefHealthInsuranceCoverageId,'9999-01-01')
                `);
                console.log('Sistema de Salud insertado en PersonHealth.');
            } else {
                console.log('No se insertará sistema de salud (sistemaSaludId vacío o nulo)');
            }

            // -----------------------------
            // NUEVO: Insertar en PersonLocationAddress (Local Escolar)
            // Grupo de Datos: Datos Escolares
            // -----------------------------
            // Local escolar (comentado porque la tabla PersonLocation no existe)
            /*
            console.log('Verificando si se insertará local escolar:', localEscolar);
            if (localEscolar) {
                console.log(`Insertando Local Escolar con ID: ${localEscolar} en PersonLocationAddress...`);
                // Aquí iría el código de inserción si existe
                // const requestPersonLocation = new sql.Request(transaction);
                // requestPersonLocation.input('PersonId', sql.Int, personId);
                // requestPersonLocation.input('LocationId', sql.Int, localEscolar);
                // await requestPersonLocation.query(`
                //     INSERT INTO PersonLocation (PersonId, LocationId)
                //     VALUES (@PersonId, @LocationId)
                // `);
                // console.log('Local Escolar insertado en PersonLocation.');
            } else {
                console.log('No se insertará local escolar (localEscolar vacío o nulo)');
            }
            */

            // Verificar existencia de usuario estudiante ANTES de la transacción
            console.log('Verificando si se insertará UserAuthentication para el estudiante:', runIpeValue);
            let usuarioExiste = false;
            if (runIpeValue) {
                const checkUser = await pool.request()
                    .input('UserName', sql.NVarChar, runIpeValue)
                    .query('SELECT * FROM UserAuthentication WHERE LOWER(UserName) = LOWER(@UserName)');
                console.log('Resultado de búsqueda de usuario existente:', checkUser.recordset.length);
                usuarioExiste = checkUser.recordset.length > 0;
            }

            // Dentro de la transacción, solo insertar si !usuarioExiste
            // --- Insertar en UserAuthentication para el estudiante si no existe ---
            if (runIpeValue && !usuarioExiste) {
                console.log('PRE-INSERT UserAuthentication ESTUDIANTE:', {
                    PersonId: personId,
                    UserName: runIpeValue,
                    Password: '12345',
                    FirstName: primerNombre,
                    LastName: apellidoPaterno,
                    SecondLastName: apellidoMaterno,
                    RefSexId: sexo,
                    Address: domicilio,
                    RoleId: 6,
                    SchoolId: selectedColegio
                });
                const saltEstudiante = await bcrypt.genSalt(10);
                const hashedClaveEstudiante = await bcrypt.hash('12345', saltEstudiante);
                const requestAuthEstudiante = new sql.Request(transaction);
                requestAuthEstudiante.input('PersonId', sql.Int, personId);
                requestAuthEstudiante.input('UserName', sql.NVarChar, runIpeValue);
                requestAuthEstudiante.input('PasswordHash', sql.NVarChar, hashedClaveEstudiante);
                requestAuthEstudiante.input('Salt', sql.NVarChar, saltEstudiante);
                requestAuthEstudiante.input('CreatedAt', sql.DateTime, new Date());
                requestAuthEstudiante.input('FirstName', sql.NVarChar, primerNombre);
                requestAuthEstudiante.input('LastName', sql.NVarChar, apellidoPaterno);
                requestAuthEstudiante.input('SecondLastName', sql.NVarChar, apellidoMaterno);
                requestAuthEstudiante.input('RefSexId', sql.Int, sexo);
                requestAuthEstudiante.input('Address', sql.NVarChar, domicilio);
                requestAuthEstudiante.input('Cellphone', sql.NVarChar, null);
                requestAuthEstudiante.input('University', sql.NVarChar, null);
                requestAuthEstudiante.input('UniversityDegree', sql.NVarChar, null);
                requestAuthEstudiante.input('GraduationDate', sql.Date, null);
                requestAuthEstudiante.input('Email', sql.NVarChar, null);
                requestAuthEstudiante.input('Landline', sql.NVarChar, null);
                requestAuthEstudiante.input('RoleId', sql.Int, 6);
                requestAuthEstudiante.input('SchoolId', sql.Int, selectedColegio);
                requestAuthEstudiante.input('DeletedAt', sql.DateTime, null);
                requestAuthEstudiante.input('LastLogin', sql.DateTime, null);
                try {
                    await requestAuthEstudiante.query(`
                        INSERT INTO UserAuthentication (
                            PersonId, UserName, PasswordHash, Salt, CreatedAt, FirstName, LastName, SecondLastName, 
                            RefSexId, Address, Cellphone, University, UniversityDegree, GraduationDate, 
                            Email, Landline, RoleId, SchoolId, DeletedAt, LastLogin
                        ) VALUES (
                            @PersonId, @UserName, @PasswordHash, @Salt, @CreatedAt, @FirstName, @LastName, @SecondLastName, 
                            @RefSexId, @Address, @Cellphone, @University, @UniversityDegree, @GraduationDate, 
                            @Email, @Landline, @RoleId, @SchoolId, @DeletedAt, @LastLogin
                        )
                    `);
                } catch (err) {
                    console.error('Error en la inserción en UserAuthentication:', err);
                }
            }

            await transaction.commit();
            console.log('Transacción completada.');

            // --- Verificar relación de apoderado y luego insertar en UserAuthentication ---
            try {
                console.log('--- INICIO: Verificar relación de apoderado ---');
                const checkApoderadoRelation = await pool.request()
                    .input('RelatedPersonId', sql.Int, personId)
                    .query(`
                        SELECT PersonId
                        FROM PersonRelationship
                        WHERE RelatedPersonId = @RelatedPersonId AND RefPersonRelationshipId = 31
                    `);

                if (checkApoderadoRelation.recordset.length > 0) {
                    const apoderadoPersonId = checkApoderadoRelation.recordset[0].PersonId;
                    console.log('Apoderado encontrado con PersonId:', apoderadoPersonId);

                    // Verificar si ya existe el apoderado en UserAuthentication
                    const checkApoderado = await pool.request()
                        .input('PersonId', sql.Int, apoderadoPersonId)
                        .query('SELECT * FROM UserAuthentication WHERE PersonId = @PersonId');

                    if (checkApoderado.recordset.length === 0) {
                        console.log('Apoderado no existe en UserAuthentication, procediendo a crear...');
                        const saltApoderado = await bcrypt.genSalt(10);
                        const hashedClaveApoderado = await bcrypt.hash('12345', saltApoderado);

                        const requestAuthApoderado = new sql.Request(pool);
                        requestAuthApoderado.input('PersonId', sql.Int, apoderadoPersonId);
                        requestAuthApoderado.input('UserName', sql.NVarChar, rutOipeApoderado);
                        requestAuthApoderado.input('PasswordHash', sql.NVarChar, hashedClaveApoderado);
                        requestAuthApoderado.input('Salt', sql.NVarChar, saltApoderado);
                        requestAuthApoderado.input('CreatedAt', sql.DateTime, new Date());
                        requestAuthApoderado.input('FirstName', sql.NVarChar, primerNombreApoderado);
                        requestAuthApoderado.input('LastName', sql.NVarChar, apellidoPaternoApoderado);
                        requestAuthApoderado.input('SecondLastName', sql.NVarChar, apellidoMaternoApoderado);
                        requestAuthApoderado.input('RefSexId', sql.Int, null);
                        requestAuthApoderado.input('Address', sql.NVarChar, domicilioApoderado);
                        requestAuthApoderado.input('Cellphone', sql.NVarChar, telefonoApoderado);
                        requestAuthApoderado.input('University', sql.NVarChar, null);
                        requestAuthApoderado.input('UniversityDegree', sql.NVarChar, null);
                        requestAuthApoderado.input('GraduationDate', sql.Date, null);
                        requestAuthApoderado.input('Email', sql.NVarChar, emailApoderado);
                        requestAuthApoderado.input('Landline', sql.NVarChar, null);
                        requestAuthApoderado.input('RoleId', sql.Int, 7);
                        requestAuthApoderado.input('SchoolId', sql.Int, selectedColegio);
                        requestAuthApoderado.input('DeletedAt', sql.DateTime, null);
                        requestAuthApoderado.input('LastLogin', sql.DateTime, null);

                        console.log('Ejecutando insert de apoderado en UserAuthentication...');
                        await requestAuthApoderado.query(`
                            INSERT INTO UserAuthentication (
                                PersonId, UserName, PasswordHash, Salt, CreatedAt, FirstName, LastName, SecondLastName, 
                                RefSexId, Address, Cellphone, University, UniversityDegree, GraduationDate, 
                                Email, Landline, RoleId, SchoolId, DeletedAt, LastLogin
                            ) VALUES (
                                @PersonId, @UserName, @PasswordHash, @Salt, @CreatedAt, @FirstName, @LastName, @SecondLastName, 
                                @RefSexId, @Address, @Cellphone, @University, @UniversityDegree, @GraduationDate, 
                                @Email, @Landline, @RoleId, @SchoolId, @DeletedAt, @LastLogin
                            )
                        `);
                        console.log('Apoderado insertado exitosamente en UserAuthentication');
                    } else {
                        console.log('Apoderado ya existe en UserAuthentication');
                    }
                } else {
                    console.log('No se encontró relación de apoderado para el estudiante');
                }
                console.log('--- FIN: Verificar relación de apoderado ---');
            } catch (err) {
                console.error('ERROR al verificar o insertar apoderado en UserAuthentication:', err);
            }

            res.status(200).json({ message: 'Estudiante creado exitosamente' });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear estudiante:', error);
            res.status(500).json({ error: 'Error al crear estudiante' });
        }
    } catch (error) {
        console.error('Error al crear estudiante:', error);
        res.status(500).json({ error: 'Error al crear estudiante' });
    }
};






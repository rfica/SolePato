const sql = require('mssql');
const { poolPromise } = require('../../config/db');

exports.getCursosPorColegio = async (req, res) => {
  const { colegioId } = req.params;

  try {
    console.log(`Consultando cursos para el colegio con ID: ${colegioId}`);
    const pool = await poolPromise;

    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
      

WITH RecursiveCTE AS (
    SELECT 
        O.OrganizationId, 
        O.Name, 
        ORel.OrganizationId AS ChildOrganizationId
    FROM 
        Organization O
    INNER JOIN 
        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
    WHERE 
        O.OrganizationId = @ColegioId

    UNION ALL

    SELECT 
        O.OrganizationId, 
        O.Name, 
        ORel.OrganizationId AS ChildOrganizationId
    FROM 
        Organization O
    INNER JOIN 
        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
    INNER JOIN 
        RecursiveCTE R ON ORel.Parent_OrganizationId = R.ChildOrganizationId
),

GradosYLetras AS (
    SELECT 
        R.Name AS CodigoEnseñanzaName, 
        Grado.Name AS GradoName, 
        Letra.Name AS LetraName,
        ISNULL(PJ.FirstName + ' ' + PJ.LastName, 'No Asignado') AS ProfesorJefe,
        ISNULL(CAST(PJ.PersonId AS NVARCHAR), NULL) AS ProfesorJefeId,
        ISNULL(CS.MaximumCapacity, 0) AS CapacidadMaxima,
        Letra.OrganizationId AS OrganizationId
    FROM 
        RecursiveCTE R
    INNER JOIN 
        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
    LEFT JOIN 
        OrganizationRelationship ORelLetra ON Grado.OrganizationId = ORelLetra.Parent_OrganizationId
    LEFT JOIN 
        Organization Letra ON ORelLetra.OrganizationId = Letra.OrganizationId
    LEFT JOIN 
        OrganizationPersonRole OPRJ ON Letra.OrganizationId = OPRJ.OrganizationId AND OPRJ.RoleId = 5
    LEFT JOIN 
        Person PJ ON OPRJ.PersonId = PJ.PersonId
    LEFT JOIN 
        CourseSection CS ON Letra.OrganizationId = CS.OrganizationId
    LEFT JOIN 
        RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
    WHERE 
        ROT_Letra.RefOrganizationElementTypeId = 21 -- Solo letras válidas
),

Electivos AS (
    SELECT 
        ORel.Parent_OrganizationId AS LetraId,
        E.Name AS ElectivoName,
        E.OrganizationId AS ElectivoId,
        CAST(P.PersonId AS NVARCHAR) AS ProfesorElectivoId,
        P.FirstName + ' ' + P.LastName AS ProfesorElectivoName
    FROM 
        OrganizationRelationship ORel
    INNER JOIN 
        Organization E ON ORel.OrganizationId = E.OrganizationId
    LEFT JOIN 
        OrganizationPersonRole OPR ON E.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
    LEFT JOIN 
        Person P ON OPR.PersonId = P.PersonId
    INNER JOIN 
        RefOrganizationType ROT_Electivo ON E.RefOrganizationTypeId = ROT_Electivo.RefOrganizationTypeId
    WHERE 
        ROT_Electivo.RefOrganizationElementTypeId = 23 -- Solo electivos
)

SELECT 
    GYL.CodigoEnseñanzaName,
    GYL.GradoName,
    ISNULL(GYL.LetraName, '-') AS LetraName,
    GYL.ProfesorJefe,
    GYL.ProfesorJefeId,
    GYL.CapacidadMaxima,
    STUFF((
        SELECT ', ' + E.ElectivoName
        FROM Electivos E
        WHERE E.LetraId = GYL.OrganizationId
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ElectivoName,
    STUFF((
        SELECT ', ' + CAST(E.ElectivoId AS NVARCHAR)
        FROM Electivos E
        WHERE E.LetraId = GYL.OrganizationId
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ElectivoIds,
    GYL.OrganizationId,
    STUFF((
        SELECT ', ' + CAST(E.ProfesorElectivoId AS NVARCHAR)
        FROM Electivos E
        WHERE E.LetraId = GYL.OrganizationId
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ProfesorElectivoId,
    STUFF((
        SELECT ', ' + E.ProfesorElectivoName
        FROM Electivos E
        WHERE E.LetraId = GYL.OrganizationId
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS ProfesorElectivoName
FROM 
    GradosYLetras GYL
ORDER BY 
    GYL.GradoName, GYL.LetraName;


      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener cursos por colegio:', error);
    res.status(500).json({ message: 'Error al obtener cursos.', error: error.message });
  }
};




exports.crearElectivo = async (req, res) => {
  const { nombreElectivo, organizationId } = req.body;

  try {
    console.log('Iniciando creación de electivo...');
    console.log(`Datos recibidos: nombreElectivo=${nombreElectivo}, organizationId=${organizationId}`);

    // Validar datos requeridos
    if (!nombreElectivo || !organizationId) {
      return res.status(400).json({ message: 'Faltan datos requeridos: nombreElectivo y organizationId.' });
    }

    const pool = await poolPromise;

    // Insertar un nuevo registro en RefOrganizationType para el electivo
    console.log('Creando un nuevo registro en RefOrganizationType...');
    const refTypeResult = await pool.request()
      .input('description', sql.NVarChar, nombreElectivo) // Usar el nombre del electivo proporcionado
      .input('refOrganizationElementTypeId', sql.Int, 23) // Valor fijo
      .query(`
        INSERT INTO RefOrganizationType (Description, Code, Definition, RefJurisdictionId, RefOrganizationElementTypeId, SortOrder)
        OUTPUT INSERTED.RefOrganizationTypeId
        VALUES (
          @description, 
          NULL, -- El Code será actualizado después
          NULL, -- Definition por defecto NULL
          NULL, -- RefJurisdictionId por defecto NULL
          @refOrganizationElementTypeId, 
          NULL -- SortOrder por defecto NULL
        );
      `);

    const refOrganizationTypeId = refTypeResult.recordset[0].RefOrganizationTypeId;

    // Generar el código dinámico y actualizar en RefOrganizationType
    const refCode = `ELE${String(refOrganizationTypeId).padStart(3, '0')}`;
    console.log(`Nuevo RefOrganizationTypeId creado: ${refOrganizationTypeId}, Code generado: ${refCode}`);

    await pool.request()
      .input('refOrganizationTypeId', sql.Int, refOrganizationTypeId)
      .input('code', sql.NVarChar, refCode)
      .query(`
        UPDATE RefOrganizationType
        SET Code = @code
        WHERE RefOrganizationTypeId = @refOrganizationTypeId;
      `);

    // Insertar el electivo en la tabla Organization
    console.log('Insertando electivo en la tabla Organization...');
    const organizationResult = await pool.request()
      .input('name', sql.NVarChar, nombreElectivo)
      .input('refOrganizationTypeId', sql.Int, refOrganizationTypeId)
      .query(`
        INSERT INTO Organization (Name, RefOrganizationTypeId)
        OUTPUT INSERTED.OrganizationId
        VALUES (@name, @refOrganizationTypeId);
      `);

    const electivoId = organizationResult.recordset[0].OrganizationId;
    console.log(`Electivo creado con OrganizationId: ${electivoId}`);

    // Relacionar el electivo con el OrganizationId proporcionado en OrganizationRelationship
    console.log(`Creando relación entre Parent_OrganizationId=${organizationId} y OrganizationId=${electivoId}...`);
    await pool.request()
      .input('parentId', sql.Int, organizationId)
      .input('childId', sql.Int, electivoId)
      .input('refOrganizationRelationshipId', sql.Int, 3) // Tipo de relación
      .query(`
        INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId)
        VALUES (@parentId, @childId, @refOrganizationRelationshipId);
      `);

    res.status(201).json({
      message: 'Electivo creado correctamente.',
      electivoId,
      refCode, // Retornar también el código generado
    });
  } catch (error) {
    console.error('Error al crear electivo:', error);
    res.status(500).json({ message: 'Error al crear el electivo.', error: error.message });
  }
};








// Obtener electivos disponibles por colegio
exports.obtenerElectivos = async (req, res) => {
  try {
    const { colegioId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
        SELECT 
          O.OrganizationId,
          O.Name,
          ROT.Description AS Type
        FROM 
          Organization O
        INNER JOIN 
          RefOrganizationType ROT ON O.RefOrganizationTypeId = ROT.RefOrganizationTypeId
        WHERE 
          ROT.RefOrganizationElementTypeId = 23
          AND EXISTS (
            SELECT 1
            FROM OrganizationRelationship ORel
            WHERE ORel.Parent_OrganizationId = @colegioId
              AND ORel.OrganizationId = O.OrganizationId
          )
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener electivos:', error);
    res.status(500).json({ message: 'Error al obtener electivos.', error: error.message });
  }
};




exports.obtenerElectivosPorCurso = async (req, res) => {
    const { organizationId } = req.params;
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('organizationId', sql.Int, organizationId)
            .query(`
                SELECT 
                    O.OrganizationId,
                    O.Name,
                    CASE 
                        WHEN ORel.Parent_OrganizationId IS NOT NULL THEN 1
                        ELSE 0
                    END AS IsSelected
                FROM Organization O
                LEFT JOIN OrganizationRelationship ORel 
                    ON O.OrganizationId = ORel.OrganizationId 
                    AND ORel.Parent_OrganizationId = @organizationId
                WHERE O.RefOrganizationTypeId IN (
                    SELECT RefOrganizationTypeId
                    FROM RefOrganizationType
                    WHERE RefOrganizationElementTypeId = 23
                );
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener electivos por curso:', error);
        res.status(500).json({ message: 'Error al obtener electivos.', error: error.message });
    }
};

exports.asignarElectivos = async (req, res) => {
  try {
    const { organizationId, electivos } = req.body;

    console.log('Datos recibidos para asignar electivos:', { organizationId, electivos });

    if (!organizationId || !Array.isArray(electivos) || electivos.length === 0) {
      console.log('Validación fallida: Datos inválidos.', { organizationId, electivos });
      return res.status(400).json({ message: 'Datos inválidos. Verifique los datos enviados.' });
    }

    const pool = await poolPromise;

    for (const electivoId of electivos) {
      // Verificar si la relación ya existe
      const existingRelationship = await pool.request()
        .input('parentId', sql.Int, organizationId)
        .input('electivoId', sql.Int, electivoId)
        .query(`
          SELECT COUNT(*) AS count
          FROM OrganizationRelationship
          WHERE Parent_OrganizationId = @parentId AND OrganizationId = @electivoId;
        `);

      if (existingRelationship.recordset[0].count > 0) {
        console.log(`Relación ya existente entre Parent_OrganizationId=${organizationId} y OrganizationId=${electivoId}`);
        continue; // Si ya existe, omitir este electivo
      }

      // Insertar la relación si no existe
      await pool.request()
        .input('parentId', sql.Int, organizationId)
        .input('electivoId', sql.Int, electivoId)
        .input('relationshipType', sql.Int, 3) // RefOrganizationRelationshipId = 3 (tipo de relación)
        .query(`
          INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId)
          VALUES (@parentId, @electivoId, @relationshipType);
        `);

      console.log(`Relación creada entre ${organizationId} y ${electivoId}`);
    }

    res.status(200).json({ message: 'Electivos asignados correctamente.' });
  } catch (error) {
    console.error('Error al asignar electivos:', error);
    res.status(500).json({ message: 'Error al asignar electivos.', error: error.message });
  }
};






exports.desasignarElectivo = async (req, res) => {
  const { organizationId, electivoId } = req.body;

  try {
    const pool = await poolPromise;

    // Verificar dependencias antes de desasignar
    const dependencies = await pool.request()
      .input('electivoId', sql.Int, electivoId)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM OrganizationRelationship WHERE Parent_OrganizationId = @electivoId AND RefOrganizationRelationshipId = 1) AS profesores,
          (SELECT COUNT(*) FROM OrganizationRelationship WHERE Parent_OrganizationId = @electivoId AND RefOrganizationRelationshipId = 2) AS alumnos
      `);

    if (dependencies.recordset[0].profesores > 0 || dependencies.recordset[0].alumnos > 0) {
      return res.status(400).json({
        message: 'No se puede desasignar el electivo porque tiene alumnos o profesores asignados.',
      });
    }

    // Desasignar la relación
    await pool.request()
      .input('parentId', sql.Int, organizationId)
      .input('electivoId', sql.Int, electivoId)
      .query(`
        DELETE FROM OrganizationRelationship
        WHERE Parent_OrganizationId = @parentId AND OrganizationId = @electivoId;
      `);

    res.status(200).json({ message: 'Electivo desasignado correctamente.' });
  } catch (error) {
    console.error('Error al desasignar electivo:', error);
    res.status(500).json({ message: 'Error al desasignar electivo.', error: error.message });
  }
};





exports.getProfesoresPorColegio = async (req, res) => {
  const { colegioId } = req.params;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
        SELECT DISTINCT
          P.PersonId,
          P.FirstName,
          P.MiddleName,
          P.LastName,
          P.SecondLastName
        FROM 
          Person P
        INNER JOIN 
          OrganizationPersonRole OPR ON P.PersonId = OPR.PersonId
        INNER JOIN
          Organization O ON O.OrganizationId = OPR.OrganizationId
        INNER JOIN
          RefOrganizationType ROT ON O.RefOrganizationTypeId = ROT.RefOrganizationTypeId
        WHERE 
          OPR.OrganizationId = @colegioId
          AND OPR.RoleId = 5 -- Rol de profesor
       --   AND ROT.RefOrganizationElementTypeId IN (21, 46);
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener profesores:', error);
    res.status(500).json({ message: 'Error al obtener profesores.', error: error.message });
  }
};



exports.asignarProfesorAElectivo = async (req, res) => {
    const { electivoId, profesorId } = req.body;

    if (!electivoId || !profesorId) {
        return res.status(400).json({ message: 'Datos inválidos. Proporcione un ID de electivo y un ID de profesor.' });
    }

    try {
        const pool = await poolPromise;

        const existingRelationship = await pool.request()
            .input('PersonId', sql.Int, profesorId)
            .input('OrganizationId', sql.Int, electivoId)
            .query(`
                SELECT COUNT(*) AS count
                FROM OrganizationPersonRole
                WHERE PersonId = @PersonId AND OrganizationId = @OrganizationId AND RoleId = 5;
            `);

        if (existingRelationship.recordset[0].count > 0) {
            return res.status(400).json({ message: 'El profesor ya está asignado a este electivo.' });
        }

        await pool.request()
            .input('PersonId', sql.Int, profesorId)
            .input('OrganizationId', sql.Int, electivoId)
            .input('RoleId', sql.Int, 5)
            .query(`
                INSERT INTO OrganizationPersonRole (PersonId, OrganizationId, RoleId)
                VALUES (@PersonId, @OrganizationId, @RoleId);
            `);

        res.status(200).json({ message: 'Profesor asignado correctamente al electivo.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al asignar profesor al electivo.', error: error.message });
    }
};

exports.desasignarProfesorAElectivo = async (req, res) => {
    const { electivoId, profesorId } = req.body;

    if (!electivoId || !profesorId) {
        return res.status(400).json({ message: 'Datos inválidos. Proporcione un ID de electivo y un ID de profesor.' });
    }

    try {
        const pool = await poolPromise;

        const existingRelationship = await pool.request()
            .input('PersonId', sql.Int, profesorId)
            .input('OrganizationId', sql.Int, electivoId)
            .query(`
                SELECT COUNT(*) AS count
                FROM OrganizationPersonRole
                WHERE PersonId = @PersonId AND OrganizationId = @OrganizationId AND RoleId = 5;
            `);

        if (existingRelationship.recordset[0].count === 0) {
            return res.status(400).json({ message: 'El profesor no está asignado a este electivo.' });
        }

        await pool.request()
            .input('PersonId', sql.Int, profesorId)
            .input('OrganizationId', sql.Int, electivoId)
            .query(`
                DELETE FROM OrganizationPersonRole
                WHERE PersonId = @PersonId AND OrganizationId = @OrganizationId AND RoleId = 5;
            `);

        res.status(200).json({ message: 'Profesor desasignado correctamente del electivo.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al desasignar profesor del electivo.', error: error.message });
    }
};




// Obtener profesores del colegio por electivo
exports.getProfesoresPorElectivo = async (req, res) => {
    const { electivoId } = req.params;

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('electivoId', sql.Int, electivoId)
            .query(`
                SELECT 
                    P.PersonId,
                    CONCAT(P.FirstName, ' ', P.LastName) AS FullName,
                    CASE 
                        WHEN OPR.OrganizationId IS NOT NULL THEN 1 
                        ELSE 0 
                    END AS IsAssigned
                FROM 
                    Person P
                LEFT JOIN OrganizationPersonRole OPR 
                    ON P.PersonId = OPR.PersonId 
                    AND OPR.OrganizationId = @electivoId
                    AND OPR.RoleId = 5 -- Rol de profesor
                WHERE P.PersonId IN (
                    SELECT DISTINCT OPR.PersonId 
                    FROM OrganizationPersonRole OPR
                    WHERE OPR.RoleId = 5 -- Solo profesores
                )
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener profesores del electivo:', error);
        res.status(500).json({ message: 'Error al obtener profesores del electivo.' });
    }
};




exports.asignarAlumno = async (req, res) => {
  const { electivoId, alumnoId } = req.body;

  try {
    const pool = await poolPromise;

    // Verificar si la asignación ya existe
    const existingAssignment = await pool.request()
      .input('electivoId', sql.Int, electivoId)
      .input('alumnoId', sql.Int, alumnoId)
      .query(`
        SELECT COUNT(*) AS count
        FROM OrganizationPersonRole
        WHERE OrganizationId = @electivoId AND PersonId = @alumnoId AND RoleId = 6;
      `);

    if (existingAssignment.recordset[0].count > 0) {
      return res.status(400).json({ message: 'El alumno ya está asignado a este electivo.' });
    }

    // Insertar la asignación
    await pool.request()
      .input('electivoId', sql.Int, electivoId)
      .input('alumnoId', sql.Int, alumnoId)
      .input('roleId', sql.Int, 6) // RoleId = 6 para estudiantes
      .query(`
        INSERT INTO OrganizationPersonRole (OrganizationId, PersonId, RoleId)
        VALUES (@electivoId, @alumnoId, @roleId);
      `);

    res.status(200).json({ message: 'Alumno asignado correctamente.' });
  } catch (error) {
    console.error('Error al asignar alumno:', error);
    res.status(500).json({ message: 'Error al asignar alumno.', error: error.message });
  }
};


exports.desasignarAlumno = async (req, res) => {
  const { electivoId, alumnoId } = req.body;

  try {
    const pool = await poolPromise;

    // Verificar si la asignación existe
    const existingAssignment = await pool.request()
      .input('electivoId', sql.Int, electivoId)
      .input('alumnoId', sql.Int, alumnoId)
      .query(`
        SELECT COUNT(*) AS count
        FROM OrganizationPersonRole
        WHERE OrganizationId = @electivoId AND PersonId = @alumnoId AND RoleId = 6;
      `);

    if (existingAssignment.recordset[0].count === 0) {
      return res.status(400).json({ message: 'El alumno no está asignado a este electivo.' });
    }

    // Eliminar la asignación
    await pool.request()
      .input('electivoId', sql.Int, electivoId)
      .input('alumnoId', sql.Int, alumnoId)
      .query(`
        DELETE FROM OrganizationPersonRole
        WHERE OrganizationId = @electivoId AND PersonId = @alumnoId AND RoleId = 6;
      `);

    res.status(200).json({ message: 'Alumno desasignado correctamente.' });
  } catch (error) {
    console.error('Error al desasignar alumno:', error);
    res.status(500).json({ message: 'Error al desasignar alumno.', error: error.message });
  }
};



exports.getAlumnosPorLetra = async (req, res) => {
  const { letraId, colegioId, electivoId } = req.params;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('letraId', sql.Int, letraId)
      .input('electivoId', sql.Int, electivoId)
      .query(`
        WITH AlumnosPorGrado AS (
          SELECT 
            P.PersonId,
            CONCAT(P.FirstName, ' ', P.LastName) AS FullName,
            Grado.Name AS GradoName,
            Letra.Name AS LetraName,
            Letra.OrganizationId AS LetraId
          FROM 
            Organization Grado
          INNER JOIN 
            OrganizationRelationship ORel ON Grado.OrganizationId = ORel.Parent_OrganizationId
          INNER JOIN 
            Organization Letra ON ORel.OrganizationId = Letra.OrganizationId
          LEFT JOIN 
            OrganizationPersonRole OPR ON Letra.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 6
          LEFT JOIN 
            Person P ON OPR.PersonId = P.PersonId
          WHERE 
            Letra.OrganizationId = @letraId
        )
        SELECT 
          APG.PersonId,
          APG.FullName,
          APG.GradoName,
          APG.LetraName,
          APG.LetraId,
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM OrganizationPersonRole OPR
              WHERE OPR.PersonId = APG.PersonId 
              AND OPR.OrganizationId = @electivoId
              AND OPR.RoleId = 6
            ) THEN 1
            ELSE 0
          END AS IsAssigned
        FROM 
          AlumnosPorGrado APG
        ORDER BY 
          APG.FullName;
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: 'No se encontraron alumnos para la letra seleccionada.' });
    }

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener alumnos por letra:', error);
    res.status(500).json({ message: 'Error al obtener alumnos.', error: error.message });
  }
};

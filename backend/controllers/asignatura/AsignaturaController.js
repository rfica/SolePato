// Archivo: AsignaturaController.js
const sql = require('mssql');
const { poolPromise } = require('../../config/db');


// Obtener todas las asignaturas y marcar las que están asignadas al curso
exports.getAsignaturasConIndicador = async (req, res) => {
  const { courseId } = req.params;

  try {
    const pool = await poolPromise;

    // Obtener todas las asignaturas
    const allAsignaturasResult = await pool.request().query(`
      SELECT RefOrganizationTypeId AS RefAcademicSubjectId, Description
      FROM RefOrganizationType
      WHERE RefOrganizationElementTypeId = 22
    `);
    const allAsignaturas = allAsignaturasResult.recordset;

    // Obtener las asignaturas asignadas al curso con su OrganizationId
    const assignedAsignaturasResult = await pool.request()
      .input('Parent_OrganizationId', sql.Int, courseId)
      .query(`
        SELECT 
          Organization.OrganizationId, 
          Organization.RefOrganizationTypeId AS RefAcademicSubjectId
        FROM 
          OrganizationRelationship
        JOIN 
          Organization ON Organization.OrganizationId = OrganizationRelationship.OrganizationId
        WHERE 
          OrganizationRelationship.Parent_OrganizationId = @Parent_OrganizationId
      `);
    const assignedAsignaturasMap = {};
    assignedAsignaturasResult.recordset.forEach(asign => {
      assignedAsignaturasMap[asign.RefAcademicSubjectId] = asign.OrganizationId;
    });

    // Marcar las asignaturas asignadas y agregar OrganizationId
    const asignaturasConIndicador = allAsignaturas.map(asignatura => ({
      RefAcademicSubjectId: asignatura.RefAcademicSubjectId,
      Description: asignatura.Description,
      assigned: assignedAsignaturasMap.hasOwnProperty(asignatura.RefAcademicSubjectId),
      OrganizationId: assignedAsignaturasMap[asignatura.RefAcademicSubjectId] || null,
    }));

    res.status(200).json(asignaturasConIndicador);
  } catch (error) {
    console.error('Error al obtener asignaturas con indicador:', error);
    res.status(500).json({ message: 'Error al obtener asignaturas con indicador', error: error.message });
  }
};

exports.getAsignaturasPorGrado = async (req, res) => {
    const { gradoCode, courseId } = req.params;

    if (!courseId || isNaN(courseId)) {
        return res.status(400).json({ message: "El courseId no es válido." });
    }

    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('gradoCode', sql.VarChar, gradoCode.trim())
            .input('Parent_OrganizationId', sql.Int, parseInt(courseId, 10))
            .query(`
                SELECT DISTINCT
                    AG.GradoCode, 
                    ROT.RefOrganizationTypeId, 
                    ROT.Description AS Asignatura, 
                    ROT.Code,
                    O.OrganizationId, -- Aseguramos que OrganizationId se incluya en los resultados
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM Organization O
                            JOIN OrganizationRelationship ORel ON O.OrganizationId = ORel.OrganizationId
                            WHERE O.RefOrganizationTypeId = ROT.RefOrganizationTypeId
                            AND ORel.Parent_OrganizationId = @Parent_OrganizationId
                        ) THEN 1 
                        ELSE 0 
                    END AS assigned
                FROM 
                    AsignaturaGrado AG
                JOIN 
                    RefOrganizationType ROT ON AG.RefOrganizationTypeId = ROT.RefOrganizationTypeId
                LEFT JOIN 
                    Organization O ON ROT.RefOrganizationTypeId = O.RefOrganizationTypeId
                WHERE 
                    LTRIM(RTRIM(AG.GradoCode)) = LTRIM(RTRIM(@gradoCode))
                ORDER BY 
                    AG.GradoCode, ROT.Description;
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener asignaturas por grado:', error);
        res.status(500).json({ message: 'Error al obtener asignaturas por grado', error: error.message });
    }
};


exports.desasignarAsignatura = async (req, res) => {
  const { courseId, asignaturaId } = req.body;

  // Validación de entrada
  if (!courseId || isNaN(courseId) || !asignaturaId || isNaN(asignaturaId)) {
    return res.status(400).json({ message: 'Error: ID de curso o asignatura inválido.' });
  }

  try {
    const pool = await poolPromise;

    // 1️⃣ Verificar si la asignatura está realmente asignada al curso
    const asignaturaRelacionada = await pool.request()
      .input('Parent_OrganizationId', sql.Int, courseId)
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        SELECT OrganizationRelationshipId 
        FROM OrganizationRelationship 
        WHERE Parent_OrganizationId = @Parent_OrganizationId 
          AND OrganizationId = @OrganizationId
      `);

    if (asignaturaRelacionada.recordset.length === 0) {
      return res.status(400).json({ message: 'No se puede desasignar una asignatura que no está asignada.' });
    }

    // 2️⃣ Verificar si existen profesores asignados antes de eliminarla
    const profesoresResult = await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        SELECT PersonId FROM OrganizationPersonRole
        WHERE OrganizationId = @OrganizationId
      `);

    if (profesoresResult.recordset.length > 0) {
      return res.status(400).json({ message: 'No se puede desasignar la asignatura porque tiene profesores asignados.' });
    }

    // 3️⃣ Eliminar la relación en OrganizationRelationship
    await pool.request()
      .input('Parent_OrganizationId', sql.Int, courseId)
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        DELETE FROM OrganizationRelationship
        WHERE Parent_OrganizationId = @Parent_OrganizationId 
          AND OrganizationId = @OrganizationId
      `);

    // 4️⃣ Eliminar la asignatura en CourseSection
    await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        DELETE FROM CourseSection
        WHERE OrganizationId = @OrganizationId
      `);

    // 5️⃣ Eliminar registros de OrganizationPersonRole si existen
    await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        DELETE FROM OrganizationPersonRole
        WHERE OrganizationId = @OrganizationId
      `);

    // 6️⃣ Verificar si la asignatura tiene más relaciones en OrganizationRelationship
    const relacionesResult = await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        SELECT OrganizationRelationshipId FROM OrganizationRelationship
        WHERE OrganizationId = @OrganizationId
      `);

    if (relacionesResult.recordset.length === 0) {
      // 7️⃣ Si no tiene más relaciones, eliminarla de Organization
      await pool.request()
        .input('OrganizationId', sql.Int, asignaturaId)
        .query(`
          DELETE FROM Organization
          WHERE OrganizationId = @OrganizationId
        `);
    }

    res.status(200).json({ message: 'Asignatura desasignada correctamente y eliminada del sistema.' });
  } catch (error) {
    console.error('Error al desasignar asignatura:', error);
    res.status(500).json({ message: 'Error al desasignar asignatura.', error: error.message });
  }
};







exports.asignarProfesor = async (req, res) => {
  const { courseId, asignaturaId, profesores } = req.body;

  // Validación de entrada
  if (!asignaturaId || isNaN(asignaturaId)) {
    return res.status(400).json({ message: 'ID de asignatura inválido' });
  }

  if (!Array.isArray(profesores) || profesores.length === 0) {
    return res.status(400).json({ message: 'La lista de profesores es inválida o está vacía' });
  }

  let transaction;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const profesorId of profesores) {
      if (!profesorId || isNaN(profesorId)) {
        throw new Error(`ID de profesor inválido: ${profesorId}`);
      }

      // Verificar si la relación ya existe
      const existingRelation = await transaction.request()
        .input('PersonId', sql.Int, profesorId)
        .input('OrganizationId', sql.Int, asignaturaId)
        .input('RoleId', sql.Int, 5)
        .query(`
          SELECT 1 FROM OrganizationPersonRole 
          WHERE PersonId = @PersonId 
            AND OrganizationId = @OrganizationId 
            AND RoleId = @RoleId
        `);

      if (existingRelation.recordset.length === 0) {
        // Crear una nueva relación en OrganizationPersonRole
        await transaction.request()
          .input('PersonId', sql.Int, profesorId)
          .input('OrganizationId', sql.Int, asignaturaId)
          .input('RoleId', sql.Int, 5)
          .query(`
            INSERT INTO OrganizationPersonRole (PersonId, OrganizationId, RoleId) 
            VALUES (@PersonId, @OrganizationId, @RoleId)
          `);
      }
    }

    await transaction.commit();
    res.status(200).json({ message: 'Profesor asignado correctamente a la asignatura.' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error asignando profesor a la asignatura:', error);
    res.status(500).json({ message: 'Error al asignar profesor a la asignatura', error: error.message });
  }
};


exports.getCursosPorColegio = async (req, res) => {
  try {
    const { colegioId } = req.params;
    const pool = await poolPromise;

    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
       WITH RecursiveCTE AS (
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
              ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
              ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima,
              Letra.OrganizationId AS OrganizationId,

              -- Datos de la asignatura
              Asignatura.OrganizationId AS AsignaturaId,
              ROT_Asignatura.Description AS AsignaturaDescription,

              -- Datos del profesor de la asignatura
              PA.PersonId AS ProfesorId,
              PA.FirstName + ' ' + PA.LastName AS ProfesorNombre

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
              AND ROT_Letra.RefOrganizationElementTypeId = 21  -- Tipo de elemento para letras
          LEFT JOIN 
              OrganizationRelationship ORelAsignatura ON Letra.OrganizationId = ORelAsignatura.Parent_OrganizationId
          LEFT JOIN 
              Organization Asignatura ON ORelAsignatura.OrganizationId = Asignatura.OrganizationId
          LEFT JOIN 
              RefOrganizationType ROT_Asignatura ON Asignatura.RefOrganizationTypeId = ROT_Asignatura.RefOrganizationTypeId
              AND ROT_Asignatura.RefOrganizationElementTypeId = 22  -- Tipo de elemento para asignaturas
          LEFT JOIN 
              OrganizationPersonRole OPR_A ON Asignatura.OrganizationId = OPR_A.OrganizationId AND OPR_A.RoleId = 5
          LEFT JOIN 
              Person PA ON OPR_A.PersonId = PA.PersonId
          LEFT JOIN 
              OrganizationPersonRole OPR ON Letra.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
          LEFT JOIN 
              Person P ON OPR.PersonId = P.PersonId
          LEFT JOIN 
              Course C ON Letra.OrganizationId = C.OrganizationId

          WHERE 
              ROT.RefOrganizationElementTypeId = 46  -- Tipo de elemento para grado
              AND ROT_Letra.RefOrganizationTypeId IS NOT NULL  -- Solo grados que tienen letras
      ),

      GradosSinLetras AS (
          SELECT 
              R.Name AS CodigoEnseñanzaName, 
              Grado.Name AS GradoName, 
              '-' AS LetraName,  -- Indica que es un grado sin letra
              ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
              ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima,
              Grado.OrganizationId AS OrganizationId,

              -- Datos de la asignatura
              Asignatura.OrganizationId AS AsignaturaId,
              ROT_Asignatura.Description AS AsignaturaDescription,

              -- Datos del profesor de la asignatura
              PA.PersonId AS ProfesorId,
              PA.FirstName + ' ' + PA.LastName AS ProfesorNombre

          FROM 
              RecursiveCTE R
          INNER JOIN 
              Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
          INNER JOIN 
              RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
          LEFT JOIN 
              OrganizationRelationship ORelAsignatura ON Grado.OrganizationId = ORelAsignatura.Parent_OrganizationId
          LEFT JOIN 
              Organization Asignatura ON ORelAsignatura.OrganizationId = Asignatura.OrganizationId
          LEFT JOIN 
              RefOrganizationType ROT_Asignatura ON Asignatura.RefOrganizationTypeId = ROT_Asignatura.RefOrganizationTypeId
              AND ROT_Asignatura.RefOrganizationElementTypeId = 22  -- Tipo de elemento para asignaturas
          LEFT JOIN 
              OrganizationPersonRole OPR_A ON Asignatura.OrganizationId = OPR_A.OrganizationId AND OPR_A.RoleId = 5
          LEFT JOIN 
              Person PA ON OPR_A.PersonId = PA.PersonId
          LEFT JOIN 
              OrganizationPersonRole OPR ON Grado.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
          LEFT JOIN 
              Person P ON OPR.PersonId = P.PersonId
          LEFT JOIN 
              Course C ON Grado.OrganizationId = C.OrganizationId

          WHERE 
              ROT.RefOrganizationElementTypeId = 46  -- Tipo de elemento para grado
              AND NOT EXISTS (
                  SELECT 1
                  FROM OrganizationRelationship ORelLetras
                  JOIN Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
                  JOIN RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
                  WHERE ORelLetras.Parent_OrganizationId = Grado.OrganizationId
                    AND ROT_Letra.RefOrganizationElementTypeId = 21  -- Solo letras válidas
              )
      )

      SELECT * FROM GradosConLetras
      UNION ALL
      SELECT * FROM GradosSinLetras
      ORDER BY 
          GradoName, LetraName;


      `);

    // Procesar los datos para estructurarlos correctamente
    const courses = {};

    result.recordset.forEach(row => {
      const courseKey = row.OrganizationId;
      if (!courses[courseKey]) {
        courses[courseKey] = {
          CodigoEnseñanzaName: row.CodigoEnseñanzaName,
          GradoName: row.GradoName,
          LetraName: row.LetraName,
          ProfesorJefe: row.ProfesorJefe,
          CapacidadMaxima: row.CapacidadMaxima,
          OrganizationId: row.OrganizationId,
          Asignaturas: {},
        };
      }
      const asignaturaKey = row.AsignaturaId;
      if (asignaturaKey) {
        if (!courses[courseKey].Asignaturas[asignaturaKey]) {
          courses[courseKey].Asignaturas[asignaturaKey] = {
            AsignaturaId: row.AsignaturaId,
            Description: row.AsignaturaDescription,
            Profesores: [],
          };
        }
        if (row.ProfesorId) {
          courses[courseKey].Asignaturas[asignaturaKey].Profesores.push({
            ProfesorId: row.ProfesorId,
            Nombre: row.ProfesorNombre,
          });
        }
      }
    });

    // Convertir el objeto courses en un array
    const coursesArray = Object.values(courses).map(course => {
      course.Asignaturas = Object.values(course.Asignaturas);
      return course;
    });

    res.status(200).json(coursesArray);
  } catch (error) {
    console.error('Error obteniendo cursos por colegio:', error);
    res.status(500).json({ error: 'Error al obtener los cursos.' });
  }
};


// Obtener todas las asignaturas
exports.getAllAsignaturas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT RefOrganizationTypeId AS RefAcademicSubjectId, Description
      FROM RefOrganizationType
      WHERE RefOrganizationElementTypeId = 22
    `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asignaturas:', error);
    res.status(500).json({ message: 'Error al obtener asignaturas', error: error.message });
  }
};







// Obtener profesores asignados a una asignatura
exports.getProfesoresAsignados = async (req, res) => {
  const { asignaturaId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .query(`
        SELECT P.PersonId, P.FirstName, P.LastName
        FROM OrganizationPersonRole OPR
        JOIN Person P ON OPR.PersonId = P.PersonId
        WHERE OPR.OrganizationId = @OrganizationId
      `);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener profesores asignados:', error);
    res.status(500).json({ message: 'Error al obtener profesores asignados.' });
  }
};

// Desasignar un profesor de una asignatura
exports.desasignarProfesor = async (req, res) => {
  const { asignaturaId, profesorId } = req.body;
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('OrganizationId', sql.Int, asignaturaId)
      .input('PersonId', sql.Int, profesorId)
      .query(`
        DELETE FROM OrganizationPersonRole
        WHERE OrganizationId = @OrganizationId AND PersonId = @PersonId
      `);
    res.status(200).json({ message: 'Profesor desasignado correctamente.' });
  } catch (error) {
    console.error('Error al desasignar profesor:', error);
    res.status(500).json({ message: 'Error al desasignar profesor.' });
  }
};





// Obtener todas las asignaturas relacionadas con un colegio
exports.getAsignaturasPorColegio = async (req, res) => {
  const { colegioId } = req.params;

  try {
    const pool = await poolPromise;

    // Obtener asignaturas relacionadas con el colegio mediante las relaciones jerárquicas
    const result = await pool.request()
      .input('ColegioId', sql.Int, colegioId)
      .query(`
        WITH RecursiveCTE AS (
          -- Recorrer la jerarquía desde el colegio
          SELECT 
            O.OrganizationId, 
            ORel.Parent_OrganizationId
          FROM 
            Organization O
          INNER JOIN 
            OrganizationRelationship ORel ON O.OrganizationId = ORel.OrganizationId
          WHERE 
            O.OrganizationId = @ColegioId

          UNION ALL

          SELECT 
            O.OrganizationId, 
            ORel.Parent_OrganizationId
          FROM 
            Organization O
          INNER JOIN 
            OrganizationRelationship ORel ON O.OrganizationId = ORel.OrganizationId
          INNER JOIN 
            RecursiveCTE R ON ORel.Parent_OrganizationId = R.OrganizationId
        )
        SELECT 
          Asignatura.OrganizationId AS AsignaturaId,
          Asignatura.Name AS AsignaturaName
        FROM 
          RecursiveCTE
        INNER JOIN 
          OrganizationRelationship ORel ON RecursiveCTE.OrganizationId = ORel.Parent_OrganizationId
        INNER JOIN 
          Organization Asignatura ON ORel.OrganizationId = Asignatura.OrganizationId
        WHERE 
          Asignatura.RefOrganizationTypeId IN (
            SELECT RefOrganizationTypeId
            FROM RefOrganizationType
            WHERE RefOrganizationElementTypeId = 22
          )
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asignaturas por colegio:', error);
    res.status(500).json({ message: 'Error al obtener asignaturas por colegio', error: error.message });
  }
};


// Función para asignar asignaturas a un curso o letra
exports.asignarAsignatura = async (req, res) => {
  const { courseId, asignaturas } = req.body;

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const asignaturaId of asignaturas) {
      // Obtener la descripción de la asignatura de RefOrganizationType
      const asignaturaDescResult = await transaction.request()
        .input('RefOrganizationTypeId', sql.Int, asignaturaId)
        .query(`
          SELECT Description
          FROM RefOrganizationType
          WHERE RefOrganizationTypeId = @RefOrganizationTypeId
            AND RefOrganizationElementTypeId = 22
        `);

      if (asignaturaDescResult.recordset.length === 0) {
        throw new Error(`Asignatura con ID ${asignaturaId} no encontrada en RefOrganizationType.`);
      }

      const asignaturaDescription = asignaturaDescResult.recordset[0].Description;

      // Asignar la asignatura al curso o letra correspondiente
      await asignarAsignatura(transaction, courseId, asignaturaId, asignaturaDescription);
    }

    await transaction.commit();
    res.status(200).json({ message: 'Asignaturas asignadas correctamente al curso.' });
  } catch (error) {
    console.error('Error asignando asignatura:', error);
    res.status(500).json({ message: 'Error al asignar asignatura', error: error.message });
  }
};

// Función auxiliar para manejar la asignación en la base de datos
async function asignarAsignatura(transaction, parentId, asignaturaId, asignaturaDescription) {
  // Insertar la asignatura en la tabla Organization como un nuevo registro
  const insertAsignaturaResult = await transaction.request()
    .input('Name', sql.VarChar, asignaturaDescription)
    .input('RefOrganizationTypeId', sql.Int, asignaturaId)
    .query(`
      INSERT INTO Organization (Name, RefOrganizationTypeId)
      OUTPUT INSERTED.OrganizationId
      VALUES (@Name, @RefOrganizationTypeId)
    `);

  const asignaturaOrgId = insertAsignaturaResult.recordset[0].OrganizationId;

  // Insertar relación en OrganizationRelationship
  await transaction.request()
    .input('Parent_OrganizationId', sql.Int, parentId)
    .input('OrganizationId', sql.Int, asignaturaOrgId)
    .input('RefOrganizationRelationshipId', sql.Int, 3) // Relación padre-hijo
    .query(`
      INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId)
      VALUES (@Parent_OrganizationId, @OrganizationId, @RefOrganizationRelationshipId)
    `);

  // Consultar la capacidad máxima del curso o letra
  const capacityResult = await transaction.request()
    .input('OrganizationId', sql.Int, parentId)
    .query(`
      SELECT MaximumCapacity
      FROM Course
      WHERE OrganizationId = @OrganizationId
    `);

  const maximumCapacity = capacityResult.recordset.length > 0
    ? capacityResult.recordset[0].MaximumCapacity
    : 0; // Valor predeterminado en caso de no encontrar capacidad

  // Insertar en CourseSection
  await transaction.request()
    .input('OrganizationId', sql.Int, asignaturaOrgId)
    .input('CourseId', sql.Int, parentId)
    .input('MaximumCapacity', sql.Int, maximumCapacity)
    .query(`
      INSERT INTO CourseSection (OrganizationId, CourseId, MaximumCapacity)
      VALUES (@OrganizationId, @CourseId, @MaximumCapacity)
    `);
}

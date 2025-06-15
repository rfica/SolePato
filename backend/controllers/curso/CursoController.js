const sql = require('mssql');
//const { poolPromise } = require('../config/db');
const { poolPromise } = require('../../config/db');



exports.crearCurso = async (req, res) => {
  const {
    nombreCurso,
    nivel,
    letrasSeleccionadas,
    capacidadMaxima,
    profesorJefe,
    colegioId,
    codigoEnsenanzaId,
    gradoId,
  } = req.body;

  console.log('Datos recibidos para la creación del curso:', req.body);

  try {
    const pool = await poolPromise;

    if (!pool) {
      console.error('No se pudo obtener una conexión a la base de datos');
      return res.status(500).send('Error de conexión con la base de datos');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Obtener o insertar Código de Enseñanza
      let codigoEnsenanzaOrgId = await getExistingOrgId(transaction, codigoEnsenanzaId, 'Código de Enseñanza');
      if (!codigoEnsenanzaOrgId) {
        const codigoDescripcion = await getOrganizationTypeDescription(codigoEnsenanzaId);
        codigoEnsenanzaOrgId = await insertRelationship(
          transaction,
          codigoEnsenanzaId,
          codigoDescripcion,
          colegioId,
          codigoEnsenanzaId
        );
      }

      // Obtener o insertar Grado
      let gradoOrgId = await getExistingOrgId(transaction, gradoId, 'Grado', codigoEnsenanzaOrgId);
      if (!gradoOrgId) {
        const gradoDescripcionCompleta = await getOrganizationTypeFullDescription(gradoId);
        gradoOrgId = await insertRelationship(
          transaction,
          gradoId,
          gradoDescripcionCompleta,
          codigoEnsenanzaOrgId,
          82 // RefOrganizationTypeId para Grados
        );
      }

      // Insertar las letras seleccionadas bajo el grado
      for (const letra of letrasSeleccionadas) {
        // Obtener RefOrganizationTypeId para la letra
        const refOrganizationTypeId = await getRefOrganizationTypeIdForLetter(letra);
        if (!refOrganizationTypeId) {
          throw new Error(`No se encontró RefOrganizationTypeId para la letra: ${letra}`);
        }

        // Verificar si la letra ya existe
        const letraExistente = await getExistingOrgId(transaction, null, letra, gradoOrgId);
        let letraOrgId;

        if (!letraExistente) {
          // Crear nueva letra en Organization y OrganizationRelationship
          letraOrgId = await insertRelationship(
            transaction,
            null,
            letra,
            gradoOrgId,
            refOrganizationTypeId
          );
        } else {
          letraOrgId = letraExistente;
        }

        // Verificar si es realmente una letra
        const esLetra = await verificarSiEsLetra(transaction, letraOrgId);
        if (!esLetra) {
          console.warn(`El OrganizationId ${letraOrgId} no corresponde a una letra. No se insertará en Course.`);
          continue;
        }

        // Inserción en Course para la letra específica
        const courseExistente = await transaction.request()
          .input('OrganizationId', sql.Int, letraOrgId)
          .query('SELECT OrganizationId FROM Course WHERE OrganizationId = @OrganizationId');

        if (courseExistente.recordset.length === 0) {
          await transaction.request()
            .input('OrganizationId', sql.Int, letraOrgId)
            .input('MaximumCapacity', sql.Int, capacidadMaxima || 0)
            .query('INSERT INTO Course (OrganizationId, MaximumCapacity) VALUES (@OrganizationId, @MaximumCapacity)');
        }

        // Relación con el profesor jefe en OrganizationPersonRole
        if (profesorJefe) {
          const profesorExistente = await transaction.request()
            .input('OrganizationId', sql.Int, letraOrgId)
            .input('RoleId', sql.Int, 5) // Asumiendo que el rol 5 es para Profesor Jefe
            .query(
              'SELECT OrganizationId FROM OrganizationPersonRole WHERE OrganizationId = @OrganizationId AND RoleId = @RoleId'
            );

          if (profesorExistente.recordset.length === 0) {
            await transaction.request()
              .input('OrganizationId', sql.Int, letraOrgId)
              .input('PersonId', sql.Int, profesorJefe)
              .input('RoleId', sql.Int, 5)
              .query(
                'INSERT INTO OrganizationPersonRole (OrganizationId, PersonId, RoleId) VALUES (@OrganizationId, @PersonId, @RoleId)'
              );
          }
        }
      }

      await transaction.commit();
      res.status(201).json({ message: 'Curso y sus letras creados correctamente.' });
    } catch (error) {
      console.error('Error al realizar alguna inserción:', error.message);
      await transaction.rollback();
      res.status(500).send('Hubo un error al crear el curso y sus letras.');
    }
  } catch (error) {
    console.error('Error general:', error.message);
    res.status(500).send('Error en la creación del curso y sus letras.');
  }
};

// Función para verificar si un OrganizationId es una letra
async function verificarSiEsLetra(transaction, organizationId) {
  const result = await transaction.request()
    .input('OrganizationId', sql.Int, organizationId)
    .query(`
      SELECT 1
      FROM Organization O
      INNER JOIN RefOrganizationType ROT ON O.RefOrganizationTypeId = ROT.RefOrganizationTypeId
      WHERE O.OrganizationId = @OrganizationId
        AND ROT.RefOrganizationElementTypeId = 21 -- Letras tienen RefOrganizationElementTypeId = 21
    `);

  return result.recordset.length > 0;
}




// Función para obtener la descripción completa del tipo de organización (Código - Descripción)
async function getOrganizationTypeFullDescription(refOrganizationTypeId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RefOrganizationTypeId', sql.Int, refOrganizationTypeId)
    .query('SELECT Code, Description FROM RefOrganizationType WHERE RefOrganizationTypeId = @RefOrganizationTypeId');

  if (result.recordset.length > 0) {
    const { Code, Description } = result.recordset[0];
    return `${Code} - ${Description}`;
  }
  return null;
}

// Función para obtener la descripción del tipo de organización (solo descripción)
async function getOrganizationTypeDescription(refOrganizationTypeId) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('RefOrganizationTypeId', sql.Int, refOrganizationTypeId)
    .query('SELECT Description FROM RefOrganizationType WHERE RefOrganizationTypeId = @RefOrganizationTypeId');

  return result.recordset.length > 0 ? result.recordset[0].Description : null;
}

// Función auxiliar para obtener OrganizationId existente
async function getExistingOrgId(transaction, fieldId, fieldName, parentId = null) {
  const query = parentId
    ? 'SELECT Organization.OrganizationId FROM Organization INNER JOIN OrganizationRelationship ON Organization.OrganizationId = OrganizationRelationship.OrganizationId WHERE Organization.RefOrganizationTypeId = @fieldId AND OrganizationRelationship.Parent_OrganizationId = @parentId'
    : 'SELECT OrganizationId FROM Organization WHERE RefOrganizationTypeId = @fieldId';
  
  const result = await transaction.request()
    .input('fieldId', sql.Int, fieldId)
    .input('parentId', sql.Int, parentId)
    .query(query);
  
  return result.recordset.length > 0 ? result.recordset[0].OrganizationId : null;
}

// Función para insertar relaciones en la base de datos
async function insertRelationship(transaction, fieldId, name, parentId, refOrganizationTypeId) {
  const fieldResult = await transaction.request()
    .input('Name', sql.VarChar, name)
    .input('RefOrganizationTypeId', sql.Int, refOrganizationTypeId)
    .query('INSERT INTO Organization (Name, RefOrganizationTypeId) OUTPUT INSERTED.OrganizationId VALUES (@Name, @RefOrganizationTypeId)');

  const fieldOrgId = fieldResult.recordset[0].OrganizationId;

  await transaction.request()
    .input('Parent_OrganizationId', sql.Int, parentId)
    .input('Child_OrganizationId', sql.Int, fieldOrgId)
    .input('RefOrganizationRelationshipId', sql.Int, 3)
    .query('INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId) VALUES (@Parent_OrganizationId, @Child_OrganizationId, @RefOrganizationRelationshipId)');

  return fieldOrgId;
}



// Función para obtener RefOrganizationTypeId basado en la letra
async function getRefOrganizationTypeIdForLetter(letter) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('Description', sql.VarChar, letter)
    .input('RefOrganizationElementTypeId', sql.Int, 21) // Letras tienen RefOrganizationElementTypeId = 21
    .query(`
      SELECT RefOrganizationTypeId 
      FROM RefOrganizationType 
      WHERE Description = @Description AND RefOrganizationElementTypeId = @RefOrganizationElementTypeId
    `);

  return result.recordset.length > 0 ? result.recordset[0].RefOrganizationTypeId : null;
}





// Controlador para gestionar la creación y modificación de cursos
exports.crearOActualizarCurso = async (req, res) => {
  let transaction;
  try {
    const { nombreCurso, nivel, letra, capacidadMaxima, profesorJefe, colegio, codigoEnsenanza } = req.body;

    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const requestCurso = new sql.Request(transaction);
    requestCurso.input('NombreCurso', sql.NVarChar, nombreCurso);
    requestCurso.input('CodigoEnsenanza', sql.NVarChar, codigoEnsenanza);

    // Inserción del curso
    // Relación del curso con el colegio y otros parámetros (completa esta parte)

    await transaction.commit();
    res.status(200).json({ message: 'Curso creado o actualizado exitosamente.' });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error durante la transacción:', error);
    res.status(500).json({ error: 'Error al crear o actualizar el curso.' });
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
            R.OrganizationId AS CodigoEnseñanzaId, 
            R.Name AS CodigoEnseñanzaName, 
            Grado.OrganizationId AS GradoId, 
            Grado.Name AS GradoName, 
            Letra.OrganizationId AS LetraId, 
            Letra.Name AS LetraName,
            ISNULL(P.PersonId, 0) AS ProfesorJefeId, 
            ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
            ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima
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
          LEFT JOIN 
            Course C ON Grado.OrganizationId = C.OrganizationId
          LEFT JOIN 
            OrganizationPersonRole OPR ON Letra.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
          LEFT JOIN 
            Person P ON OPR.PersonId = P.PersonId
          WHERE 
            ROT.RefOrganizationElementTypeId = 46
        ),
        GradosSinLetras AS (
          SELECT 
            R.OrganizationId AS CodigoEnseñanzaId, 
            R.Name AS CodigoEnseñanzaName, 
            Grado.OrganizationId AS GradoId, 
            Grado.Name AS GradoName, 
            NULL AS LetraId, 
            '-' AS LetraName,
            ISNULL(P.PersonId, 0) AS ProfesorJefeId, 
            ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
            ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima
          FROM 
            RecursiveCTE R
          INNER JOIN 
            Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
          INNER JOIN 
            RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
          LEFT JOIN 
            OrganizationPersonRole OPR ON Grado.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
          LEFT JOIN 
            Person P ON OPR.PersonId = P.PersonId
          LEFT JOIN 
            Course C ON Grado.OrganizationId = C.OrganizationId
          WHERE 
            ROT.RefOrganizationElementTypeId = 46
            AND NOT EXISTS (
              SELECT 1
              FROM OrganizationRelationship ORelLetras
              JOIN Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
              JOIN RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
              WHERE ORelLetras.Parent_OrganizationId = Grado.OrganizationId
                AND ROT_Letra.RefOrganizationElementTypeId = 21
            )
        )
        SELECT 
          CodigoEnseñanzaId,
          CodigoEnseñanzaName,
          GradoId,
          GradoName,
          LetraId,
          LetraName,
          ProfesorJefeId,
          ProfesorJefe,
          CapacidadMaxima
        FROM 
          GradosConLetras
        UNION ALL
        SELECT 
          CodigoEnseñanzaId,
          CodigoEnseñanzaName,
          GradoId,
          GradoName,
          LetraId,
          LetraName,
          ProfesorJefeId,
          ProfesorJefe,
          CapacidadMaxima
        FROM 
          GradosSinLetras
        ORDER BY 
          GradoName, 
          LetraName;
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo cursos por colegio:', error);
    res.status(500).json({ error: 'Error al obtener los cursos.' });
  }
};



// Crear o actualizar curso con capacidad máxima
exports.updateCurso = async (req, res) => {
  let transaction;
  try {
    const { cursoId, capacidadMaxima, profesorJefe } = req.body;
    const pool = await poolPromise;

    // Iniciar la transacción
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // Validar si el curso ya existe en la tabla Course
    const courseCheckResult = await transaction.request()
      .input('organizationId', sql.Int, cursoId)
      .query(`
        SELECT OrganizationId 
        FROM Course 
        WHERE OrganizationId = @organizationId
      `);

    if (courseCheckResult.recordset.length > 0) {
      // Actualizar capacidad máxima en Course
      await transaction.request()
        .input('organizationId', sql.Int, cursoId)
        .input('capacidadMaxima', sql.Int, capacidadMaxima)
        .query(`
          UPDATE Course 
          SET MaximumCapacity = @capacidadMaxima 
          WHERE OrganizationId = @organizationId
        `);
    } else {
      // Insertar nuevo registro en Course
      await transaction.request()
        .input('organizationId', sql.Int, cursoId)
        .input('capacidadMaxima', sql.Int, capacidadMaxima)
        .query(`
          INSERT INTO Course (OrganizationId, MaximumCapacity) 
          VALUES (@organizationId, @capacidadMaxima)
        `);
    }

    // Verificar si ya existe un profesor jefe asociado
    const checkProfesor = await transaction.request()
      .input('organizationId', sql.Int, cursoId)
      .input('roleId', sql.Int, 5) // Rol 5 para profesor jefe
      .query(`
        SELECT OrganizationId 
        FROM OrganizationPersonRole 
        WHERE OrganizationId = @organizationId 
          AND RoleId = @roleId
      `);

    if (checkProfesor.recordset.length > 0) {
      // Actualizar profesor jefe
      await transaction.request()
        .input('organizationId', sql.Int, cursoId)
        .input('profesorJefe', sql.Int, profesorJefe)
        .input('roleId', sql.Int, 5)
        .query(`
          UPDATE OrganizationPersonRole 
          SET PersonId = @profesorJefe 
          WHERE OrganizationId = @organizationId 
            AND RoleId = @roleId
        `);
    } else {
      // Insertar nuevo profesor jefe
      await transaction.request()
        .input('organizationId', sql.Int, cursoId)
        .input('profesorJefe', sql.Int, profesorJefe)
        .input('roleId', sql.Int, 5)
        .query(`
          INSERT INTO OrganizationPersonRole (OrganizationId, PersonId, RoleId) 
          VALUES (@organizationId, @profesorJefe, @roleId)
        `);
    }

    // Confirmar la transacción
    await transaction.commit();
    res.status(200).json({ message: 'Curso actualizado exitosamente.' });
  } catch (error) {
    if (transaction) {
      // Rollback en caso de error
      await transaction.rollback();
    }
    console.error('Error actualizando curso:', error);
    res.status(500).json({ error: 'Error al actualizar curso.' });
  }
};

// Obtener cursos por colegio
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
        R.OrganizationId AS CodigoEnseñanzaId, 
        R.Name AS CodigoEnseñanzaName, 
        Grado.OrganizationId AS GradoId, 
        Grado.Name AS GradoName, 
        Letra.OrganizationId AS LetraId, 
        Letra.Name AS LetraName,
        ISNULL(P.PersonId, 0) AS ProfesorJefeId, 
        ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
        ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima
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
    LEFT JOIN 
        Course C ON 
            CASE 
                WHEN ROT_Letra.RefOrganizationElementTypeId = 21 THEN Letra.OrganizationId
                ELSE Grado.OrganizationId
            END = C.OrganizationId
    LEFT JOIN 
        OrganizationPersonRole OPR ON Letra.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
    LEFT JOIN 
        Person P ON OPR.PersonId = P.PersonId
    WHERE 
        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grados
),

GradosSinLetras AS (
    SELECT 
        R.OrganizationId AS CodigoEnseñanzaId, 
        R.Name AS CodigoEnseñanzaName, 
        Grado.OrganizationId AS GradoId, 
        Grado.Name AS GradoName, 
        NULL AS LetraId, 
        '-' AS LetraName,
        ISNULL(P.PersonId, 0) AS ProfesorJefeId, 
        ISNULL(P.FirstName + ' ' + P.LastName, 'No Asignado') AS ProfesorJefe,
        ISNULL(C.MaximumCapacity, 0) AS CapacidadMaxima
    FROM 
        RecursiveCTE R
    INNER JOIN 
        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
    INNER JOIN 
        RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
    LEFT JOIN 
        Course C ON Grado.OrganizationId = C.OrganizationId
    LEFT JOIN 
        OrganizationPersonRole OPR ON Grado.OrganizationId = OPR.OrganizationId AND OPR.RoleId = 5
    LEFT JOIN 
        Person P ON OPR.PersonId = P.PersonId
    WHERE 
        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grados
        AND NOT EXISTS (
            SELECT 1
            FROM OrganizationRelationship ORelLetras
            JOIN Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
            WHERE ORelLetras.Parent_OrganizationId = Grado.OrganizationId
        )
)

SELECT 
    CodigoEnseñanzaId,
    CodigoEnseñanzaName,
    GradoId,
    GradoName,
    LetraId,
    LetraName,
    ProfesorJefeId,
    ProfesorJefe,
    CapacidadMaxima
FROM 
    GradosConLetras
UNION ALL
SELECT 
    CodigoEnseñanzaId,
    CodigoEnseñanzaName,
    GradoId,
    GradoName,
    LetraId,
    LetraName,
    ProfesorJefeId,
    ProfesorJefe,
    CapacidadMaxima
FROM 
    GradosSinLetras
ORDER BY 
    GradoName, 
    LetraName;

      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo cursos por colegio:', error);
    res.status(500).json({ error: 'Error al obtener los cursos.' });
  }
};



// Obtener las letras asociadas a un grado específico en base a RefOrganizationTypeId y Parent_OrganizationId
exports.getLetrasPorGrado = async (req, res) => {
  try {
    const { refOrganizationTypeId, colegioId } = req.params; // Recibimos los parámetros necesarios
    const pool = await poolPromise;

 console.log('Letras encontradas   refOrganizationTypeId  :', refOrganizationTypeId);
 console.log('Letras encontradas   colegioId :', colegioId );

    const result = await pool.request()
      .input('refOrganizationTypeId', sql.Int, refOrganizationTypeId)
      .input('colegioId', sql.Int, colegioId)
      .query(`
        WITH JerarquiaCTE AS (
          SELECT 
            ORel.OrganizationId, 
            ORel.Parent_OrganizationId
          FROM 
            OrganizationRelationship ORel
          WHERE 
            ORel.Parent_OrganizationId = @colegioId

          UNION ALL

          SELECT 
            ORel.OrganizationId,
            ORel.Parent_OrganizationId
          FROM 
            OrganizationRelationship ORel
          INNER JOIN 
            JerarquiaCTE ON ORel.Parent_OrganizationId = JerarquiaCTE.OrganizationId
        )
        SELECT 
          Letra.OrganizationId AS LetraId,
          Letra.Name AS LetraName
        FROM 
          Organization Grado
        INNER JOIN 
          JerarquiaCTE ON JerarquiaCTE.OrganizationId = Grado.OrganizationId
        INNER JOIN 
          OrganizationRelationship ORel ON Grado.OrganizationId = ORel.Parent_OrganizationId
        INNER JOIN 
          Organization Letra ON ORel.OrganizationId = Letra.OrganizationId
        WHERE 
          Grado.RefOrganizationTypeId = @refOrganizationTypeId;
      `);

  console.log('Letras encontradas:', result.recordset);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo las letras del grado:', error);
    res.status(500).json({ error: 'Error al obtener las letras del grado.' });
  }
};



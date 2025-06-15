// backend/controllers/notas/notasController.js

const { poolPromise } = require('../../config/db');
const sql = require('mssql');



// GET /api/notas/anios
exports.getAniosAcademicos = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT DISTINCT CalendarYear
      FROM OrganizationCalendar
      ORDER BY CalendarYear DESC
    `);
    res.json(result.recordset.map(r => ({ CalendarYear: r.CalendarYear })));
  } catch (error) {
    console.error('Error al obtener años académicos:', error);
    res.status(500).json({ error: 'Error al obtener años académicos.' });
  }
};

// GET /api/notas/cursos/:colegioId
exports.getCursosPorColegio = async (req, res) => {
  const { colegioId } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .query(`
        WITH RecursiveCTE AS (
            SELECT 
                o.OrganizationId, 
                o.Name, 
                rel.OrganizationId AS ChildOrganizationId,
                rel.Parent_OrganizationId
            FROM Organization o
            INNER JOIN OrganizationRelationship rel ON o.OrganizationId = rel.Parent_OrganizationId
            WHERE o.OrganizationId = @colegioId

            UNION ALL

            SELECT 
                o.OrganizationId, 
                o.Name, 
                rel.OrganizationId AS ChildOrganizationId,
                rel.Parent_OrganizationId
            FROM Organization o
            INNER JOIN OrganizationRelationship rel ON o.OrganizationId = rel.Parent_OrganizationId
            INNER JOIN RecursiveCTE r ON rel.Parent_OrganizationId = r.ChildOrganizationId
        ),

        GradosConLetras AS (
            SELECT 
                r.Name AS CodigoEnsenanzaName,
                g.Name AS GradoName,
                l.Name AS LetraName,
                l.OrganizationId AS CourseSectionId
            FROM RecursiveCTE r
            INNER JOIN Organization g ON r.ChildOrganizationId = g.OrganizationId
            INNER JOIN RefOrganizationType rotg ON g.RefOrganizationTypeId = rotg.RefOrganizationTypeId
            LEFT JOIN OrganizationRelationship relLetra ON g.OrganizationId = relLetra.Parent_OrganizationId
            LEFT JOIN Organization l ON relLetra.OrganizationId = l.OrganizationId
            LEFT JOIN RefOrganizationType rotl ON l.RefOrganizationTypeId = rotl.RefOrganizationTypeId
            WHERE rotg.RefOrganizationElementTypeId = 46 AND rotl.RefOrganizationElementTypeId = 21
        ),

        GradosSinLetras AS (
            SELECT 
                r.Name AS CodigoEnsenanzaName,
                g.Name AS GradoName,
                NULL AS LetraName,
                g.OrganizationId AS CourseSectionId
            FROM RecursiveCTE r
            INNER JOIN Organization g ON r.ChildOrganizationId = g.OrganizationId
            INNER JOIN RefOrganizationType rotg ON g.RefOrganizationTypeId = rotg.RefOrganizationTypeId
            WHERE rotg.RefOrganizationElementTypeId = 46 AND NOT EXISTS (
                SELECT 1
                FROM OrganizationRelationship relLetra
                JOIN Organization l ON relLetra.OrganizationId = l.OrganizationId
                JOIN RefOrganizationType rotl ON l.RefOrganizationTypeId = rotl.RefOrganizationTypeId
                WHERE relLetra.Parent_OrganizationId = g.OrganizationId
                  AND rotl.RefOrganizationElementTypeId = 21
            )
        )

        SELECT * FROM GradosConLetras
        UNION ALL
        SELECT * FROM GradosSinLetras
        ORDER BY GradoName, LetraName
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener cursos desde jerarquía:', error);
    res.status(500).json({ error: 'Error al obtener cursos.' });
  }
};



exports.getCursosPorAnio = async (req, res) => {
  const { anioId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('anioId', sql.Int, anioId)
      .query(`
        SELECT OrganizationId, OrganizationId AS CourseSectionId
        FROM Organization
        WHERE RefOrganizationTypeId = 21 -- ID que identifica cursos regulares
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ error: 'Error al obtener cursos.' });
  }
};



// GET /api/notas/asignaturas/:cursoId
exports.getAsignaturasPorCurso = async (req, res) => {
  const { cursoId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('cursoId', sql.Int, cursoId)
      .query(`
        SELECT
          cs.OrganizationId AS CourseId,
          org.Name AS Title
        FROM CourseSection cs
        JOIN Organization org ON cs.OrganizationId = org.OrganizationId
        WHERE cs.CourseId = @cursoId
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener asignaturas:', error);
    res.status(500).json({ error: 'Error al obtener asignaturas.' });
  }
};



// GET /api/notas/periodos?colegioId=XXX&anio=YYYY
exports.getPeriodos = async (req, res) => {
  const { colegioId, anio } = req.query;

  console.log('[PERIODOS] colegioId:', colegioId, '| anio:', anio);

  if (!colegioId || !anio) {
    return res.status(400).json({ error: 'Faltan colegioId o anio' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('colegioId', sql.Int, colegioId)
      .input('anio', sql.Int, anio)
      .query(`
        SELECT gp.GradingPeriodId, gp.Name, gp.StartDate, gp.EndDate, r.Code AS Tipo
        FROM GradingPeriod gp
        JOIN RefGradingPeriodType r ON gp.RefGradingPeriodTypeId = r.RefGradingPeriodTypeId
        WHERE gp.SchoolId = @colegioId
          AND YEAR(gp.StartDate) = @anio
        ORDER BY gp.OrderIndex
      `);

    console.log('[PERIODOS] Periodos encontrados:', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('[PERIODOS] Error al obtener periodos:', error);
    res.status(500).json({ error: 'Error al obtener periodos.' });
  }
};





// GET /api/notas/estudiantes/:cursoId
exports.getEstudiantesPorCurso = async (req, res) => {
  const { cursoId } = req.params;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('cursoId', sql.Int, cursoId)
      .query(`
        SELECT opr.OrganizationPersonRoleId, p.FirstName, p.LastName, p.SecondLastName
        FROM OrganizationPersonRole opr
        JOIN Person p ON opr.PersonId = p.PersonId
        WHERE opr.OrganizationId = @cursoId
          AND opr.RoleId = 6 -- estudiante
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener estudiantes:', error);
    res.status(500).json({ error: 'Error al obtener estudiantes.' });
  }
};



// POST /api/notas/guardar
exports.guardarNotas = async (req, res) => {
  const notas = req.body;

  if (!Array.isArray(notas) || notas.length === 0) {
    return res.status(400).json({ error: 'El payload debe contener al menos una nota.' });
  }

  try {
    const pool = await poolPromise;

    for (const nota of notas) {
      const {
        OrganizationPersonRoleId,
        Nota,
        TipoNota,
        CursoId,
        AsignaturaId,
        PeriodoId
      } = nota;

      // Verifica si ya existe una evaluación
      const existingAssessment = await pool.request()
        .input('CourseId', sql.Int, AsignaturaId)
        .input('CourseSectionId', sql.Int, CursoId)
        .input('GradingPeriodId', sql.Int, PeriodoId)
        .input('Type', sql.VarChar, TipoNota)
        .query(`
          SELECT TOP 1 AssessmentId
          FROM Assessment
          WHERE CourseId = @CourseId
            AND CourseSectionId = @CourseSectionId
            AND GradingPeriodId = @GradingPeriodId
            AND Type = @Type
        `);

      let assessmentId;

      if (existingAssessment.recordset.length > 0) {
        assessmentId = existingAssessment.recordset[0].AssessmentId;
      } else {
        const nueva = await pool.request()
          .input('CourseId', sql.Int, AsignaturaId)
          .input('CourseSectionId', sql.Int, CursoId)
          .input('GradingPeriodId', sql.Int, PeriodoId)
          .input('Type', sql.VarChar, TipoNota)
          .input('Title', sql.VarChar, 'Evaluación automática')
          .input('Description', sql.VarChar, 'Generada desde frontend')
          .input('RecordStartDateTime', sql.DateTime, new Date())
          .query(`
            INSERT INTO Assessment (CourseId, CourseSectionId, GradingPeriodId, Type, Title, Description, RecordStartDateTime)
            OUTPUT INSERTED.AssessmentId
            VALUES (@CourseId, @CourseSectionId, @GradingPeriodId, @Type, @Title, @Description, @RecordStartDateTime)
          `);

        assessmentId = nueva.recordset[0].AssessmentId;
      }

      // Inserta o actualiza en AssessmentRegistration
      await pool.request()
        .input('AssessmentId', sql.Int, assessmentId)
        .input('OrgRoleId', sql.Int, OrganizationPersonRoleId)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM AssessmentRegistration
            WHERE AssessmentId = @AssessmentId AND OrganizationPersonRoleId = @OrgRoleId
          )
          INSERT INTO AssessmentRegistration (AssessmentId, OrganizationPersonRoleId)
          VALUES (@AssessmentId, @OrgRoleId)
        `);

      // Inserta o actualiza en AssessmentScore
      await pool.request()
        .input('AssessmentId', sql.Int, assessmentId)
        .input('OrgRoleId', sql.Int, OrganizationPersonRoleId)
        .input('Score', sql.Decimal(5, 2), Nota)
        .input('ScoreStatus', sql.VarChar, 'Final')
        .query(`
          IF EXISTS (
            SELECT 1 FROM AssessmentScore
            WHERE AssessmentId = @AssessmentId AND OrganizationPersonRoleId = @OrgRoleId
          )
          UPDATE AssessmentScore
          SET Score = @Score, ScoreStatus = @ScoreStatus
          WHERE AssessmentId = @AssessmentId AND OrganizationPersonRoleId = @OrgRoleId
          ELSE
          INSERT INTO AssessmentScore (AssessmentId, OrganizationPersonRoleId, Score, ScoreStatus)
          VALUES (@AssessmentId, @OrgRoleId, @Score, @ScoreStatus)
        `);
    }

    res.status(200).json({ message: 'Notas guardadas exitosamente.' });
  } catch (error) {
    console.error('Error al guardar notas:', error);
    res.status(500).json({ error: 'Error al guardar notas.' });
  }
};


// GET /api/notas/leer
exports.getNotasGuardadasPorCursoAsignaturaPeriodo = async (req, res) => {
  const { cursoId, asignaturaId, periodoId } = req.query;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId)
      .input('periodoId', sql.Int, periodoId)
      .query(`
        SELECT 
          r.OrganizationPersonRoleId,
          p.FirstName + ' ' + ISNULL(p.LastName, '') + ' ' + ISNULL(p.SecondLastName, '') AS Estudiante,
          ar.AssessmentRegistrationId,
          res.ScoreValue,
          res.AssessmentSubtestId,
          s.Identifier AS Columna,
          s.Title AS NombreColumna,
          s.RefAssessmentSubtestTypeId, -- ✅ este campo ahora está incluido
          gp.Name AS Periodo,
          ar.CreationDate
        FROM AssessmentResult res
        JOIN AssessmentRegistration ar ON res.AssessmentRegistrationId = ar.AssessmentRegistrationId
        JOIN OrganizationPersonRole r ON r.PersonId = ar.PersonId
        JOIN Person p ON p.PersonId = r.PersonId
        JOIN AssessmentSubtest s ON res.AssessmentSubtestId = s.AssessmentSubtestId
        JOIN GradingPeriod gp ON ar.CreationDate BETWEEN gp.StartDate AND gp.EndDate
        WHERE ar.CourseSectionOrganizationId = @asignaturaId
          AND ar.OrganizationId = @cursoId
          AND gp.GradingPeriodId = @periodoId
        ORDER BY r.OrganizationPersonRoleId, s.Identifier;
      `);

    res.json(result.recordset);

  } catch (error) {
    console.error('Error al leer notas:', error);
    res.status(500).json({ error: 'Error al leer notas.' });
  }
};





exports.crearHojaNotas = async (req, res) => {
  const { cursoId, asignaturaId, periodoId, assignedByPersonId } = req.body;

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log('[CREAR_HOJA] Iniciando proceso...');

    const cursoSection = await pool.request()
      .input('CourseId', sql.Int, cursoId)
      .input('SubjectId', sql.Int, asignaturaId)
      .query(`
        SELECT OrganizationId 
        FROM CourseSection 
        WHERE CourseId = @CourseId AND OrganizationId = @SubjectId
      `);

    if (cursoSection.recordset.length === 0) {
      return res.status(400).json({ error: 'No existe CourseSection para ese curso y asignatura.' });
    }

    const courseSectionOrgId = cursoSection.recordset[0].OrganizationId;

    const padreCursoRes = await pool.request()
      .input('childOrgId', sql.Int, asignaturaId)
      .query(`
        SELECT Parent_OrganizationId 
        FROM OrganizationRelationship 
        WHERE OrganizationId = @childOrgId
      `);
    if (padreCursoRes.recordset.length === 0) {
      return res.status(400).json({ error: 'No se pudo determinar el curso padre del ID de asignatura.' });
    }
    const cursoPadreId = padreCursoRes.recordset[0].Parent_OrganizationId;

    const fechas = await pool.request()
      .input('periodoId', sql.Int, periodoId)
      .query(`SELECT StartDate, EndDate FROM GradingPeriod WHERE GradingPeriodId = @periodoId`);
    if (fechas.recordset.length === 0) {
      return res.status(400).json({ error: 'Periodo no válido.' });
    }
    const { StartDate } = fechas.recordset[0];

    const estudiantesRes = await pool.request()
      .input('cursoId', sql.Int, cursoId)
      .query(`SELECT PersonId FROM OrganizationPersonRole WHERE OrganizationId = @cursoId AND RoleId = 6`);
    const estudiantes = estudiantesRes.recordset;
    if (estudiantes.length === 0) {
      return res.status(400).json({ error: 'No hay estudiantes en este curso.' });
    }

    for (let i = 1; i <= 10; i++) {
      const shortName = `N${i}`;
      await new sql.Request(transaction)
        .input('ShortName', sql.NVarChar(30), shortName)
        .input('Title', sql.NVarChar(60), `Columna ${shortName}`)
        .input('Objective', sql.NVarChar(100), `Generado automáticamente`)
        .input('RefAcademicSubjectId', sql.Int, 1)
        .input('AssessmentFamilyTitle', sql.NVarChar(60), `Evaluación tipo ${shortName}`)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Assessment WHERE ShortName = @ShortName)
          BEGIN
            INSERT INTO Assessment (
              ShortName, Title, Objective, RefAcademicSubjectId, AssessmentFamilyTitle
            )
            VALUES (
              @ShortName, @Title, @Objective, @RefAcademicSubjectId, @AssessmentFamilyTitle
            )
          END
        `);

      const assessmentIdResult = await new sql.Request(transaction)
        .input('ShortName', sql.NVarChar(30), shortName)
        .query(`SELECT AssessmentId FROM Assessment WHERE ShortName = @ShortName`);
      const assessmentId = assessmentIdResult.recordset[0]?.AssessmentId;

      await new sql.Request(transaction)
        .input('AssessmentId', sql.Int, assessmentId)
        .input('Name', sql.NVarChar(40), shortName)
        .input('PublishedDate', sql.Date, new Date())
        .query(`
          IF NOT EXISTS (SELECT 1 FROM AssessmentForm WHERE Name = @Name)
          BEGIN
            INSERT INTO AssessmentForm (AssessmentId, Name, PublishedDate)
            VALUES (@AssessmentId, @Name, @PublishedDate)
          END
        `);

      const formResult = await new sql.Request(transaction)
        .input('Name', sql.NVarChar(40), shortName)
        .query(`SELECT AssessmentFormId FROM AssessmentForm WHERE Name = @Name`);
      const assessmentFormId = formResult.recordset[0]?.AssessmentFormId;
      if (!assessmentFormId) throw new Error(`[CREAR_HOJA] No se encontró AssessmentFormId para ${shortName}`);

      await new sql.Request(transaction)
        .input('AssessmentFormId', sql.Int, assessmentFormId)
        .input('Identifier', sql.NVarChar(40), shortName)
        .input('Title', sql.NVarChar(60), `Subevaluación ${shortName}`)
        .input('Description', sql.NVarChar(60), `Configuración base de ${shortName}`)
        .input('RefScoreMetricTypeId', sql.Int, 1)
        .input('RefAssessmentPurposeId', sql.Int, 1)
        .input('RefAcademicSubjectId', sql.Int, 1)
        .input('RefAssessmentSubtestTypeId', sql.Int, 1)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM AssessmentSubtest WHERE Identifier = @Identifier
          )
          BEGIN
            INSERT INTO AssessmentSubtest (
              AssessmentFormId, Identifier, Title, Description,
              RefScoreMetricTypeId, RefAssessmentPurposeId, RefAcademicSubjectId,
              RefAssessmentSubtestTypeId
            )
            VALUES (
              @AssessmentFormId, @Identifier, @Title, @Description,
              @RefScoreMetricTypeId, @RefAssessmentPurposeId, @RefAcademicSubjectId,
              @RefAssessmentSubtestTypeId
            )
          END
        `);
    }

    const formN1 = await new sql.Request(transaction)
      .input('Name', sql.NVarChar(40), 'N1')
      .query(`SELECT AssessmentFormId FROM AssessmentForm WHERE Name = @Name`);
    const assessmentFormId = formN1.recordset[0]?.AssessmentFormId;
    if (!assessmentFormId) {
      return res.status(500).json({ error: 'No se encontró AssessmentFormId para N1.' });
    }

    let creados = 0;

    for (const estudiante of estudiantes) {
      const yaTieneHoja = await new sql.Request(transaction)
        .input('PersonId', sql.Int, estudiante.PersonId)
        .input('cursoId', sql.Int, courseSectionOrgId)
        .input('cursoPadreId', sql.Int, cursoPadreId)
        .query(`
          SELECT 1 FROM AssessmentRegistration
          WHERE PersonId = @PersonId AND CourseSectionOrganizationId = @cursoId AND OrganizationId = @cursoPadreId
        `);

      if (yaTieneHoja.recordset.length > 0) {
        console.log(`[CREAR_HOJA] Estudiante ${estudiante.PersonId} ya tiene hoja. Se omite.`);
        continue;
      }

      const result = await new sql.Request(transaction)
        .input('PersonId', sql.Int, estudiante.PersonId)
        .input('OrganizationId', sql.Int, cursoPadreId)
        .input('CourseSectionOrganizationId', sql.Int, courseSectionOrgId)
        .input('AssessmentFormId', sql.Int, assessmentFormId)
        .input('AssignedByPersonId', sql.Int, assignedByPersonId)
        .input('CreationDate', sql.DateTime, StartDate)
        .query(`
          INSERT INTO AssessmentRegistration (
            PersonId, OrganizationId, CourseSectionOrganizationId,
            AssessmentFormId, AssignedByPersonId, CreationDate
          )
          OUTPUT INSERTED.AssessmentRegistrationId
          VALUES (
            @PersonId, @OrganizationId, @CourseSectionOrganizationId,
            @AssessmentFormId, @AssignedByPersonId, @CreationDate
          )
        `);

      const registrationId = result.recordset[0]?.AssessmentRegistrationId;
      creados++;

      for (let i = 1; i <= 10; i++) {
        const shortName = `N${i}`;

        const subTest = await new sql.Request(transaction)
          .input('Identifier', sql.NVarChar(40), shortName)
          .query(`SELECT AssessmentSubtestId FROM AssessmentSubtest WHERE Identifier = @Identifier`);
        const subTestId = subTest.recordset[0]?.AssessmentSubtestId;

        await new sql.Request(transaction)
          .input('AssessmentRegistrationId', sql.Int, registrationId)
          .input('ScoreValue', sql.Decimal(5, 2), 0)
          .input('AssessmentSubtestId', sql.Int, subTestId)
          .input('RefScoreMetricTypeId', sql.Int, 1)
          .query(`
            INSERT INTO AssessmentResult (
              AssessmentRegistrationId, ScoreValue, AssessmentSubtestId,
              RefScoreMetricTypeId, DateCreated
            ) VALUES (
              @AssessmentRegistrationId, @ScoreValue, @AssessmentSubtestId,
              @RefScoreMetricTypeId, GETDATE()
            )
          `);
      }
    }

    await transaction.commit();
    console.log(`[CREAR_HOJA] Hoja creada correctamente. Total registros nuevos: ${creados}`);
    res.json({ success: true, created: creados });

  } catch (error) {
    console.error('Error al crear hoja de notas:', error);
    res.status(500).json({ error: 'Error al crear hoja de notas.' });
  }
};




//PARA CONFIGURACIONES DE NOTAS DE TIPO DIRECTA


// POST /api/notas/configurar-columna
exports.configurarColumna = async (req, res) => {
  const {
    assessmentId,
    identifier,
    title,
    descripcion,
    tipoEvaluacionId,
    tipoNotaId,
    escalaId,
    ponderacion,
    excluirPromedio,
    fecha,
    objetivos,
    usuarioId
  } = req.body;

  if (!assessmentId || !identifier || !escalaId || !tipoNotaId) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    const pool = await poolPromise;

    // Obtener AssessmentFormId a partir de AssessmentId
    const formResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query('SELECT AssessmentFormId FROM AssessmentForm WHERE AssessmentId = @assessmentId');

    const assessmentFormId = formResult.recordset[0]?.AssessmentFormId;

    if (!assessmentFormId) {
      return res.status(404).json({ error: 'No se encontró AssessmentFormId para el AssessmentId dado.' });
    }

    // Obtener AssessmentSubtestId usando AssessmentFormId e Identifier
    const result = await pool.request()
      .input('assessmentFormId', sql.Int, assessmentFormId)
      .input('identifier', sql.VarChar(20), identifier)
      .query(`
        SELECT AssessmentSubtestId
        FROM AssessmentSubtest
        WHERE AssessmentFormId = @assessmentFormId AND Identifier = @identifier
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró la columna a configurar.' });
    }

    const subtestId = result.recordset[0].AssessmentSubtestId;

    // Actualizar configuración de la columna
    await pool.request()
      .input('subtestId', sql.Int, subtestId)
      .input('title', sql.VarChar(100), title)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion)
      .input('tipoEvaluacionId', sql.Int, tipoEvaluacionId)
      .input('tipoNotaId', sql.Int, tipoNotaId)
      .input('escalaId', sql.Int, escalaId)
      .input('ponderacion', sql.Float, ponderacion)
      .input('excluirPromedio', sql.Int, excluirPromedio)
      .input('fecha', sql.Date, fecha)
      .query(`
        UPDATE AssessmentSubtest
        SET Title = @title,
            Description = @descripcion,
            RefAssessmentPurposeId = @tipoEvaluacionId,
            RefAssessmentSubtestTypeId = @tipoNotaId,
            RefScoreMetricTypeId = @escalaId,
            WeightPercent = @ponderacion,
            ExcludeFromFinalScore = @excluirPromedio,
            DateAssigned = @fecha
        WHERE AssessmentSubtestId = @subtestId
      `);

    // Eliminar OA anteriores
    await pool.request()
      .input('subtestId', sql.Int, subtestId)
      .query(`DELETE FROM AssessmentSubtestObjective WHERE AssessmentSubtestId = @subtestId`);

    // Insertar nuevos OA
    if (objetivos && objetivos.length > 0) {
      for (const oaId of objetivos) {
        await pool.request()
          .input('subtestId', sql.Int, subtestId)
          .input('oaId', sql.Int, oaId)
          .input('usuarioId', sql.Int, usuarioId)
          .query(`
            INSERT INTO AssessmentSubtestObjective (AssessmentSubtestId, LearningObjectiveId, UsuarioId)
            VALUES (@subtestId, @oaId, @usuarioId)
          `);
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al configurar columna:', error);
    res.status(500).json({ error: 'Error interno al guardar configuración de columna.' });
  }
};




// GET /api/notas/opciones-referencia
exports.getOpcionesReferencia = async (req, res) => {
  try {
    const pool = await poolPromise;

    const [tiposNota, escalas, propositos] = await Promise.all([
      pool.request().query(`SELECT RefAssessmentSubtestTypeId AS id, Description FROM RefAssessmentSubtestType`),
      pool.request().query(`SELECT RefScoreMetricTypeId AS id, Description FROM RefScoreMetricType where RefScoreMetricTypeId In (31)`),
      pool.request().query(`SELECT RefAssessmentPurposeId AS id, Description FROM RefAssessmentPurpose where RefAssessmentPurposeId in (22,23,24) `)

    ]);

    res.json({
      tiposColumna: tiposNota.recordset,
      escalas: escalas.recordset,
      tiposEvaluacion: propositos.recordset
    });
  } catch (error) {
    console.error('Error al obtener opciones de referencia:', error);
    res.status(500).json({ error: 'Error al obtener opciones de referencia.' });
  }
};


// GET /api/notas/conceptos-escalas
exports.getConceptosEscalas = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT ConceptCode, DisplayText, MinValue, MaxValue, Color, SortOrder
      FROM RefConceptualScale
      ORDER BY SortOrder
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener escala conceptual:', error);
    res.status(500).json({ error: 'Error al obtener escala conceptual.' });
  }
};

// GET /api/notas/objetivos-aprendizaje?cursoId=...&asignaturaId=...
exports.getObjetivosAprendizaje = async (req, res) => {
  const { cursoId, asignaturaId } = req.query;

  if (!cursoId || !asignaturaId) {
    return res.status(400).json({ error: 'Faltan cursoId o asignaturaId en la consulta.' });
  }

  try {
    const pool = await poolPromise;

    console.log('[OA] Buscando OA para cursoId:', cursoId, 'y asignaturaId:', asignaturaId);

    const result = await pool.request()
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId)
      .query(`
        SELECT DISTINCT
          LO.LearningObjectiveId,
          LO.ObjectiveCode AS Code,
          CAST(LO.ObjectiveDescription AS VARCHAR(MAX)) AS Description
        FROM CourseSectionScheduleObjective CSO
        INNER JOIN CourseSectionSchedule CSS ON CSO.CourseSectionScheduleId = CSS.CourseSectionScheduleId
        INNER JOIN LearningObjective LO ON CSO.LearningObjectiveId = LO.LearningObjectiveId
        WHERE CSO.CursoId = @cursoId
          AND CSS.OrganizationId = @asignaturaId
      `);

    console.log('[OA] Total encontrados:', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('[OA] Error al obtener OA:', error);
    res.status(500).json({
      error: 'Error al obtener objetivos de aprendizaje.',
      detalle: error.message
    });
  }
};




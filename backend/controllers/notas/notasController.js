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
        SELECT opr.OrganizationPersonRoleId, p.PersonId, p.FirstName, p.LastName, p.SecondLastName
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
  const { notas } = req.body;

  if (!Array.isArray(notas) || notas.length === 0) {
    return res.status(400).json({ error: 'El payload debe contener al menos una nota.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log('[DEBUG BACKEND] Recibidas notas para guardar:', notas.length);

    for (const nota of notas) {
      const {
        assessmentId,
          columna,
          organizationPersonRoleId,
          scoreValue,
          fecha
      } = nota;

        if (!assessmentId || !organizationPersonRoleId) {
          console.warn('[WARN] Nota sin assessmentId o organizationPersonRoleId:', nota);
          continue;
        }

        // 1. Obtener el personId desde organizationPersonRoleId
        const personResult = await new sql.Request(transaction)
          .input('organizationPersonRoleId', sql.Int, organizationPersonRoleId)
          .query(`
            SELECT PersonId, OrganizationId
            FROM OrganizationPersonRole
            WHERE OrganizationPersonRoleId = @organizationPersonRoleId
          `);

        if (personResult.recordset.length === 0) {
          console.warn(`[WARN] No se encontró PersonId para OrganizationPersonRoleId: ${organizationPersonRoleId}`);
          continue;
        }

        const personId = personResult.recordset[0].PersonId;
        const cursoId = personResult.recordset[0].OrganizationId;

        // 2. Obtener AssessmentAdministrationId
        const adminResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
          .query(`
            SELECT TOP 1 aa.AssessmentAdministrationId
            FROM Assessment_AssessmentAdministration aa
            WHERE aa.AssessmentId = @assessmentId
          `);

        if (adminResult.recordset.length === 0) {
          console.warn(`[WARN] No se encontró AssessmentAdministrationId para AssessmentId: ${assessmentId}`);
          continue;
        }

        const assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;

        // 3. Verificar si ya existe registro en AssessmentRegistration
        const regResult = await new sql.Request(transaction)
          .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
        .input('personId', sql.Int, personId)
        .query(`
          SELECT TOP 1 AssessmentRegistrationId
          FROM AssessmentRegistration
            WHERE AssessmentAdministrationId = @assessmentAdministrationId
            AND PersonId = @personId
        `);

      let assessmentRegistrationId;

      if (regResult.recordset.length === 0) {
        // No existe, crear registro
          const insertResult = await new sql.Request(transaction)
            .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('personId', sql.Int, personId)
            .input('cursoId', sql.Int, cursoId)
            .input('fecha', sql.Date, fecha || new Date())
          .query(`
              INSERT INTO AssessmentRegistration (
                AssessmentAdministrationId,
                PersonId,
                OrganizationId,
                CourseSectionOrganizationId,
                CreationDate
              )
            OUTPUT INSERTED.AssessmentRegistrationId
              VALUES (
                @assessmentAdministrationId,
                @personId,
                @cursoId,
                NULL,
                @fecha
              )
          `);

        assessmentRegistrationId = insertResult.recordset[0].AssessmentRegistrationId;
          console.log(`[DEBUG] Creado nuevo AssessmentRegistrationId: ${assessmentRegistrationId}`);
      } else {
        assessmentRegistrationId = regResult.recordset[0].AssessmentRegistrationId;
          console.log(`[DEBUG] Usando AssessmentRegistrationId existente: ${assessmentRegistrationId}`);
      }

        // 4. Verificar si ya existe resultado
        const resultCheck = await new sql.Request(transaction)
        .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
        .query(`
          SELECT TOP 1 AssessmentResultId
          FROM AssessmentResult
            WHERE AssessmentRegistrationId = @assessmentRegistrationId
        `);

      if (resultCheck.recordset.length > 0) {
        // Actualizar
          await new sql.Request(transaction)
          .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
            .input('scoreValue', sql.Decimal(4, 1), parseFloat(scoreValue))
            .input('fecha', sql.Date, fecha || new Date())
          .query(`
            UPDATE AssessmentResult
              SET ScoreValue = @scoreValue,
                  DateCreated = @fecha
              WHERE AssessmentRegistrationId = @assessmentRegistrationId
          `);
          console.log(`[DEBUG] Actualizada nota para AssessmentRegistrationId: ${assessmentRegistrationId}, valor: ${scoreValue}`);
      } else {
        // Insertar
          await new sql.Request(transaction)
          .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
            .input('scoreValue', sql.Decimal(4, 1), parseFloat(scoreValue))
            .input('fecha', sql.Date, fecha || new Date())
          .query(`
              INSERT INTO AssessmentResult (
                AssessmentRegistrationId,
                ScoreValue,
                DateCreated
              )
              VALUES (
                @assessmentRegistrationId,
                @scoreValue,
                @fecha
              )
            `);
          console.log(`[DEBUG] Insertada nueva nota para AssessmentRegistrationId: ${assessmentRegistrationId}, valor: ${scoreValue}`);
        }
      }

      await transaction.commit();
    res.status(200).json({ message: 'Notas guardadas exitosamente.' });

  } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[ERROR] Error al guardar notas:', error);
    res.status(500).json({ error: 'Error al guardar notas: ' + error.message });
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
        WITH ColumnasNotas AS (
          SELECT
            a.AssessmentId,
            a.Identifier AS Columna,
            a.Title AS NombreColumna,
            a.RefAssessmentSubtestTypeId,
            a.VisualNoteType,
            aa.AssessmentAdministrationId
          FROM Assessment a
          INNER JOIN AssessmentAdministration aa ON aa.AssessmentId = a.AssessmentId
          INNER JOIN AssessmentAdministration_Organization aao ON aao.AssessmentAdministrationId = aa.AssessmentAdministrationId
          WHERE a.Identifier IN ('N1','N2','N3','N4','N5','N6','N7','N8','N9','N10')
            AND aao.OrganizationId = @asignaturaId
        ),
        EstudiantesCurso AS (
          SELECT
            r.OrganizationPersonRoleId,
            p.FirstName + ' ' + ISNULL(p.LastName, '') + ' ' + ISNULL(p.SecondLastName, '') AS Estudiante,
            p.PersonId
          FROM OrganizationPersonRole r
          INNER JOIN Person p ON p.PersonId = r.PersonId
          WHERE r.OrganizationId = @cursoId
            AND r.RoleId = 6 -- Estudiantes
        ),
        RegistroNotas AS (
          SELECT
            ar.AssessmentRegistrationId,
            ar.PersonId,
            ar.AssessmentAdministrationId,
            ar.CreationDate,
            res.ScoreValue
          FROM AssessmentRegistration ar
          LEFT JOIN AssessmentResult res ON res.AssessmentRegistrationId = ar.AssessmentRegistrationId
          WHERE ar.CourseSectionOrganizationId = @asignaturaId
        ),
        GrillaNotas AS (
          SELECT
            e.OrganizationPersonRoleId,
            e.Estudiante,
            cn.AssessmentId,
            cn.Columna,
            cn.NombreColumna,
            cn.RefAssessmentSubtestTypeId,
            cn.VisualNoteType,
            ISNULL(rn.ScoreValue, 0.00) AS ScoreValue,
            rn.AssessmentRegistrationId,
            gp.Name AS Periodo,
            rn.CreationDate
          FROM ColumnasNotas cn
          CROSS JOIN EstudiantesCurso e
          LEFT JOIN RegistroNotas rn ON rn.AssessmentAdministrationId = cn.AssessmentAdministrationId AND rn.PersonId = e.PersonId
          LEFT JOIN GradingPeriod gp ON rn.CreationDate BETWEEN gp.StartDate AND gp.EndDate AND gp.GradingPeriodId = @periodoId
        )
        SELECT *
        FROM GrillaNotas
        ORDER BY OrganizationPersonRoleId, Columna;
      `);

    console.log(`[GET_NOTAS] Total registros devueltos: ${result.recordset.length}`);
    console.log(`[GET_NOTAS] Columnas encontradas: ${[...new Set(result.recordset.map(r => r.Columna))].join(', ')}`);

    res.json(result.recordset);

  } catch (error) {
    console.error('[ERROR] al leer notas:', error);
    res.status(500).json({ error: 'Error al leer notas.' });
  }
};




exports.crearHojaNotas = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    const {
      courseSectionOrganizationId,
      periodo,
      asignaturaId,
      courseSectionId,
      schoolId,
      fechaEvaluacion,
      estudiantes
    } = req.body;

    const horaInicio = '09:00:00';
    const horaFin = '10:00:00';

    if (!fechaEvaluacion || isNaN(Date.parse(`${fechaEvaluacion}T${horaInicio}`))) {
      console.error('[ERROR] Fecha inválida recibida:', fechaEvaluacion);
      return res.status(400).json({ error: 'Fecha de evaluación inválida o no enviada.' });
    }

    const fechaInicioISO = `${fechaEvaluacion}T${horaInicio}`;
    const fechaFinISO = `${fechaEvaluacion}T${horaFin}`;

    await transaction.begin();

    for (let i = 1; i <= 10; i++) {
      const identifier = `N${i}`;
      const title = `Detalle evaluacion ${identifier}`;
      console.log(`[CREAR_HOJA] Creando Assessment ${identifier}...`);

      const request1 = transaction.request();
      const resultAssessment = await request1
        .input('Identifier', sql.NVarChar, identifier)
        .input('Title', sql.NVarChar, null)
        .input('RefAssessmentPurposeId', sql.Int, 5)
        .input('RefAssessmentTypeId', sql.Int, 28)
        .input('RefScoreMetricTypeId', sql.Int, 31)
        .input('VisualNoteType', sql.Int, 1)
        .input('WeightPercent', sql.Float, null)
        .input('Objective', sql.NVarChar, title)
        .input('AssessmentRevisionDate', sql.Date, fechaEvaluacion)
        .input('Tier', sql.Int, null)
        .input('RefAssessmentSubtestTypeId', sql.Int, 1)
        .query(`
          INSERT INTO Assessment (
            Identifier, Title, RefAssessmentPurposeId, RefAssessmentTypeId,
            RefScoreMetricTypeId, VisualNoteType, WeightPercent,
            Objective, AssessmentRevisionDate, Tier, RefAssessmentSubtestTypeId,
            RefAcademicSubjectId, AssessmentFamilyTitle
          )
          OUTPUT INSERTED.AssessmentId
          VALUES (
            @Identifier, @Title, @RefAssessmentPurposeId, @RefAssessmentTypeId,
            @RefScoreMetricTypeId, @VisualNoteType, @WeightPercent,
            @Objective, @AssessmentRevisionDate, @Tier, @RefAssessmentSubtestTypeId,
            1, @Identifier
          )
        `);

      const assessmentId = resultAssessment.recordset[0].AssessmentId;
      console.log(`[CREAR_HOJA] AssessmentId creado: ${assessmentId}`);

      const request2 = transaction.request();
      const resultAdmin = await request2
        .input('AssessmentId', sql.Int, assessmentId)
        .input('Name', sql.NVarChar, title)
        .query(`
          INSERT INTO AssessmentAdministration (AssessmentId, Name)
          OUTPUT INSERTED.AssessmentAdministrationId
          VALUES (@AssessmentId, @Name)
        `);

      const administrationId = resultAdmin.recordset[0].AssessmentAdministrationId;
      console.log(`[CREAR_HOJA] AssessmentAdministrationId: ${administrationId}`);

      await transaction.request()
        .input('AssessmentAdministrationId', sql.Int, administrationId)
        .input('OrganizationId', sql.Int, asignaturaId)
        .query(`
          INSERT INTO AssessmentAdministration_Organization (AssessmentAdministrationId, OrganizationId)
          VALUES (@AssessmentAdministrationId, @OrganizationId)
        `);

      await transaction.request()
        .input('AssessmentId', sql.Int, assessmentId)
        .input('AssessmentAdministrationId', sql.Int, administrationId)
        .query(`
          INSERT INTO Assessment_AssessmentAdministration (AssessmentId, AssessmentAdministrationId)
          VALUES (@AssessmentId, @AssessmentAdministrationId)
        `);

      const request3 = transaction.request();
      const sessionResult = await request3
        .input('AssessmentAdministrationId', sql.Int, administrationId)
        .input('ScheduledStartDateTime', sql.DateTime, new Date(fechaInicioISO))
        .input('ScheduledEndDateTime', sql.DateTime, new Date(fechaFinISO))
        .input('OrganizationId', sql.Int, asignaturaId)
        .input('School_OrganizationId', sql.Int, schoolId)
        .query(`
          INSERT INTO AssessmentSession (
            AssessmentAdministrationId, ScheduledStartDateTime, ScheduledEndDateTime,
            OrganizationId, School_OrganizationId
          )
          OUTPUT INSERTED.AssessmentSessionId
          VALUES (
            @AssessmentAdministrationId, @ScheduledStartDateTime, @ScheduledEndDateTime,
            @OrganizationId, @School_OrganizationId
          )
        `);

      const sessionId = sessionResult.recordset[0].AssessmentSessionId;

      if (estudiantes.length > 0) {
        const docenteId = estudiantes[0]?.DocenteId;
        if (docenteId) {
          await transaction.request()
            .input('RefAssessmentSessionStaffRoleTypeId', sql.Int, 1)
            .input('PersonId', sql.Int, docenteId)
            .input('AssessmentSessionId', sql.Int, sessionId)
            .input('AssessmentParticipantSessionId', sql.Int, null)
            .query(`
              INSERT INTO AssessmentSessionStaffRole (
                RefAssessmentSessionStaffRoleTypeId, PersonId, AssessmentSessionId, AssessmentParticipantSessionId
              )
              VALUES (@RefAssessmentSessionStaffRoleTypeId, @PersonId, @AssessmentSessionId, @AssessmentParticipantSessionId)
            `);
        }
      }

      for (const est of estudiantes) {
        if (!est?.PersonId) {
          console.warn('[ADVERTENCIA] Estudiante omitido por no tener PersonId:', est);
          continue;
        }

        const request4 = transaction.request();
        const registrationResult = await request4
          .input('AssessmentAdministrationId', sql.Int, administrationId)
          .input('CourseSectionOrganizationId', sql.Int, asignaturaId)
          .input('PersonId', sql.Int, est.PersonId)
          .input('AssignedByPersonId', sql.Int, est.DocenteId)
          .input('OrganizationId', sql.Int, asignaturaId)
          .query(`
            INSERT INTO AssessmentRegistration (
              AssessmentAdministrationId, CourseSectionOrganizationId,
              PersonId, AssignedByPersonId, OrganizationId
            )
            OUTPUT INSERTED.AssessmentRegistrationId
            VALUES (
              @AssessmentAdministrationId, @CourseSectionOrganizationId,
              @PersonId, @AssignedByPersonId, @OrganizationId
            )
          `);

        const registrationId = registrationResult.recordset[0].AssessmentRegistrationId;

        await transaction.request()
          .input('AssessmentRegistrationId', sql.Int, registrationId)
          .input('AssessmentSubtestId', sql.Int, null)
          .input('ScoreValue', sql.NVarChar, null)
          .query(`
            INSERT INTO AssessmentResult (
              AssessmentRegistrationId, AssessmentSubtestId, ScoreValue
            )
            VALUES (
              @AssessmentRegistrationId, @AssessmentSubtestId, @ScoreValue
            )
          `);

        await transaction.request()
          .input('RefAssessmentSessionStaffRoleTypeId', sql.Int, 6)
          .input('PersonId', sql.Int, est.PersonId)
          .input('AssessmentSessionId', sql.Int, sessionId)
          .query(`
            INSERT INTO AssessmentSessionStaffRole (
              RefAssessmentSessionStaffRoleTypeId, PersonId, AssessmentSessionId
            )
            VALUES (
              @RefAssessmentSessionStaffRoleTypeId, @PersonId, @AssessmentSessionId
            )
          `);

        await transaction.request()
          .input('PersonId', sql.Int, est.PersonId)
          .input('AssessmentRegistrationId', sql.Int, registrationId)
          .input('CourseSectionId', sql.Int, asignaturaId)
          .input('AssignedByPersonId', sql.Int, null)
          .input('SchoolOrganizationId', sql.Int, schoolId)
          //.input('RecordStartDateTime', sql.DateTime, null)
          .query(`
            INSERT INTO LearnerActivity (
              PersonId, AssessmentRegistrationId, CourseSectionId,
              AssignedByPersonId, SchoolOrganizationId
            )
            VALUES (
              @PersonId, @AssessmentRegistrationId, @CourseSectionId,
              @AssignedByPersonId, @SchoolOrganizationId
            )
          `);
      }
    }

    await transaction.commit();
    console.log('[CREAR_HOJA] Hoja de notas creada correctamente');
    res.json({ message: 'Hoja de notas creada correctamente.' });

  } catch (error) {
    await transaction.rollback();
    console.error('[ERROR] Falló la creación de hoja de notas:', error);
    res.status(500).json({ error: 'Error al crear hoja de notas.' });
  }
};



//PARA CONFIGURACIONES DE NOTAS DE TIPO DIRECTA



// GET /api/notas/opciones-referencia
exports.getOpcionesReferencia = async (req, res) => {
  try {
    const pool = await poolPromise;

    const [tiposNota, escalas, propositos] = await Promise.all([
      pool.request().query(`SELECT RefAssessmentSubtestTypeId AS id, Description FROM RefAssessmentSubtestType`),
      pool.request().query(`SELECT RefScoreMetricTypeId AS id, Description FROM RefScoreMetricType where RefScoreMetricTypeId In (31)`),
      //pool.request().query(`SELECT RefAssessmentPurposeId AS id, Description FROM  RefAssessmentPurpose where RefAssessmentPurposeId in (22,23,24) `)
	  pool.request().query(`SELECT RefAssessmentTypeId AS id, Description FROM  RefAssessmentType where RefAssessmentTypeId in (28,29,30) `)

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
          LO.ObjectiveCode,
          CAST(LO.ObjectiveDescription AS VARCHAR(MAX)) AS ObjectiveDescription
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



// GET /api/notas/registro-cambios
exports.getRegistroCambios = async (req, res) => {
  try {
    const pool = await poolPromise;
    let { fechaInicio, fechaFin, mes, anio } = req.query;

    const filtros = [];
    const request = pool.request();

    if (mes && anio) {
      filtros.push(`MONTH(acl.FechaCambio) = @mes AND YEAR(acl.FechaCambio) = @anio`);
      request.input('mes', sql.Int, mes);
      request.input('anio', sql.Int, anio);
    } else {
      if (!fechaInicio && !fechaFin) {
        const hoy = new Date();
        const haceUnAnio = new Date();
        haceUnAnio.setFullYear(hoy.getFullYear() - 1);
        fechaInicio = haceUnAnio.toISOString().slice(0, 10);
        fechaFin = hoy.toISOString().slice(0, 10);
      }

      if (fechaInicio) {
        filtros.push(`CAST(acl.FechaCambio AS DATE) >= @fechaInicio`);
        request.input('fechaInicio', sql.Date, fechaInicio);
      }
      if (fechaFin) {
        filtros.push(`CAST(acl.FechaCambio AS DATE) <= @fechaFin`);
        request.input('fechaFin', sql.Date, fechaFin);
      }

      if (anio && !fechaInicio && !fechaFin) {
        filtros.push(`YEAR(acl.FechaCambio) = @anio`);
        request.input('anio', sql.Int, anio);
      }
    }

    const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    const query = `
      SELECT
        acl.Id,
        acl.RegistroId,
        a.Identifier AS Casillero,
        ISNULL(ua.FirstName + ' ' + ua.LastName + ' ', '-') AS Nombre,
        CONVERT(varchar, acl.FechaCambio, 103) AS Fecha,
        CONVERT(varchar, acl.FechaCambio, 108) AS Hora,
        acl.CampoAfectadoTexto,
        acl.ValorAnteriorTexto,
        acl.ValorNuevoTexto
      FROM AssessmentChangeLog acl
      LEFT JOIN UserAuthentication ua ON acl.UsuarioId = ua.AuthId
      LEFT JOIN Assessment a ON acl.RegistroId = a.AssessmentId
      ${whereClause}
      ORDER BY acl.FechaCambio DESC
    `;

    const result = await request.query(query);

    const agrupado = {};
    for (const row of result.recordset) {
      const key = `${row.RegistroId}-${row.Fecha}-${row.Hora}`;
      if (!agrupado[key]) {
        agrupado[key] = {
          Id: row.Id,
          Nombre: row.Nombre,
          Fecha: row.Fecha,
          Hora: row.Hora,
          Casillero: row.Casillero || 'Sin ID',
          Detalles: []
        };
      }

      agrupado[key].Detalles.push(`- ${row.CampoAfectadoTexto}: ${row.ValorAnteriorTexto} → ${row.ValorNuevoTexto}`);
    }

    const final = Object.values(agrupado).map((item) => ({
      Id: item.Id,
      Nombre: item.Nombre,
      Fecha: item.Fecha,
      Hora: item.Hora,
      Detalle: `Se modificó configuración de ${item.Casillero}:\n${item.Detalles.join('\n')}`
    }));

    res.json(final);
  } catch (error) {
    console.error('Error al obtener registro de cambios:', error);
    res.status(500).json({ error: 'Error al obtener registro de cambios.' });
  }
};






// POST /api/notas/configurar-columna
exports.configurarColumna = async (req, res) => {
  console.log("========== [BACKEND] Datos recibidos en configurarColumna ==========");
  console.log(req.body);

  const {
    assessmentId,
    identifier,
    title,
    descripcion,
    tipoEvaluacionId,
    tipoNotaId,          // Ahora se guarda en Assessment.RefAssessmentSubtestTypeId
    escalaId,
    ponderacion,
    excluirPromedio,     // Se guarda en Assessment.Tier
    fecha,
    objetivos,
    usuarioId
  } = req.body;

  try {
    const pool = await poolPromise;
    let actualAssessmentId = assessmentId;

    // Si no tenemos assessmentId pero sí tenemos identifier, buscamos el assessmentId
    if (!actualAssessmentId
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





// POST /api/notas/guardar  (aun no esta probada)
exports.guardarNotas = async (req, res) => {
  const notas = req.body;

  if (!Array.isArray(notas) || notas.length === 0) {
    return res.status(400).json({ error: 'El payload debe contener al menos una nota.' });
  }

  try {
    const pool = await poolPromise;

    for (const nota of notas) {
      const {
        assessmentId,
        personId,
        courseSectionOrgId,
        nota: scoreValue
      } = nota;

      // 1. Verificar si ya existe registro en AssessmentRegistration
      const regResult = await pool.request()
        .input('assessmentId', sql.Int, assessmentId)
        .input('personId', sql.Int, personId)
        .query(`
          SELECT TOP 1 AssessmentRegistrationId
          FROM AssessmentRegistration
          WHERE PersonId = @personId AND CourseSectionOrganizationId = @courseSectionOrgId
        `);

      let assessmentRegistrationId;

      if (regResult.recordset.length > 0) {
        assessmentRegistrationId = regResult.recordset[0].AssessmentRegistrationId;
      } else {
        // Crear registro de inscripción
        const regInsert = await pool.request()
          .input('assessmentId', sql.Int, assessmentId)
          .input('personId', sql.Int, personId)
          .input('courseSectionOrgId', sql.Int, courseSectionOrgId)
          .query(`
            INSERT INTO AssessmentRegistration (AssessmentAdministrationId, PersonId, CourseSectionOrganizationId, OrganizationId)
            OUTPUT INSERTED.AssessmentRegistrationId
            VALUES (NULL, @personId, @courseSectionOrgId, NULL)
          `);

        assessmentRegistrationId = regInsert.recordset[0].AssessmentRegistrationId;
      }

      // 2. Verificar si ya existe resultado
      const resultCheck = await pool.request()
        .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 AssessmentResultId
          FROM AssessmentResult
          WHERE AssessmentRegistrationId = @assessmentRegistrationId AND AssessmentId = @assessmentId
        `);

      if (resultCheck.recordset.length > 0) {
        // Actualizar
        await pool.request()
          .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
          .input('assessmentId', sql.Int, assessmentId)
          .input('scoreValue', sql.NVarChar, scoreValue)
          .query(`
            UPDATE AssessmentResult
            SET ScoreValue = @scoreValue
            WHERE AssessmentRegistrationId = @assessmentRegistrationId AND AssessmentId = @assessmentId
          `);
      } else {
        // Insertar
        await pool.request()
          .input('assessmentRegistrationId', sql.Int, assessmentRegistrationId)
          .input('assessmentId', sql.Int, assessmentId)
          .input('scoreValue', sql.NVarChar, scoreValue)
          .query(`
            INSERT INTO AssessmentResult (AssessmentRegistrationId, AssessmentSubtestId, AssessmentId, ScoreValue)
            VALUES (@assessmentRegistrationId, NULL, @assessmentId, @scoreValue)
          `);
      }
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

    // Convertir formato de fecha DD-MM-YYYY a YYYY-MM-DD
    let fechaFormateada = fechaEvaluacion;
    if (fechaEvaluacion && fechaEvaluacion.includes('-')) {
      const partes = fechaEvaluacion.split('-');
      if (partes.length === 3 && partes[0].length === 2) {
        // Si está en formato DD-MM-YYYY
        fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }

    if (!fechaFormateada || isNaN(Date.parse(`${fechaFormateada}T${horaInicio}`))) {
      console.error('[ERROR] Fecha inválida recibida:', fechaEvaluacion, 'Fecha formateada:', fechaFormateada);
      return res.status(400).json({ error: 'Fecha de evaluación inválida o no enviada.' });
    }

    const fechaInicioISO = `${fechaFormateada}T${horaInicio}`;
    const fechaFinISO = `${fechaFormateada}T${horaFin}`;

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
        .input('AssessmentRevisionDate', sql.Date, fechaFormateada)
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

  if (!assessmentId || !escalaId || !tipoNotaId) {
    console.log("[BACKEND] Faltan campos requeridos:", { assessmentId, escalaId, tipoNotaId });
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentId, Identifier, Title, Objective AS Description,
               RefAssessmentTypeId, RefAssessmentSubtestTypeId,
               RefScoreMetricTypeId, WeightPercent, Tier,
               AssessmentRevisionDate
        FROM Assessment	  
        WHERE AssessmentId = @assessmentId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró el registro Assessment.' });
    }

    const assessment = result.recordset[0];

    const descripcionMap = {
      RefAssessmentTypeId: await getDescripcion(pool, 'RefAssessmentType', 'RefAssessmentTypeId', tipoEvaluacionId),
      RefAssessmentSubtestTypeId: await getDescripcion(pool, 'RefAssessmentSubtestType', 'RefAssessmentSubtestTypeId', tipoNotaId),
      RefScoreMetricTypeId: await getDescripcion(pool, 'RefScoreMetricType', 'RefScoreMetricTypeId', escalaId)
    };

    const anteriorMap = {
      RefAssessmentTypeId: await getDescripcion(pool, 'RefAssessmentType', 'RefAssessmentTypeId', assessment.RefAssessmentTypeId),
      RefAssessmentSubtestTypeId: await getDescripcion(pool, 'RefAssessmentSubtestType', 'RefAssessmentSubtestTypeId', assessment.RefAssessmentSubtestTypeId),
      RefScoreMetricTypeId: await getDescripcion(pool, 'RefScoreMetricType', 'RefScoreMetricTypeId', assessment.RefScoreMetricTypeId)
    };

    const campos = [
      {
        campo: 'Title',
        nuevo: title,
        anterior: assessment.Title,
        campoTexto: 'Título'
      },
      {
        campo: 'Description',
        nuevo: descripcion,
        anterior: assessment.Description,
        campoTexto: 'Descripción'
      },
      {
        campo: 'RefAssessmentTypeId',
        nuevo: tipoEvaluacionId,
        anterior: assessment.RefAssessmentTypeId,
        campoTexto: 'Tipo de Evaluación',
        textoNuevo: descripcionMap.RefAssessmentTypeId,
        textoAnterior: anteriorMap.RefAssessmentTypeId
      },
      {
        campo: 'RefAssessmentSubtestTypeId',
        nuevo: tipoNotaId,
        anterior: assessment.RefAssessmentSubtestTypeId,
        campoTexto: 'Tipo de Nota',
        textoNuevo: descripcionMap.RefAssessmentSubtestTypeId,
        textoAnterior: anteriorMap.RefAssessmentSubtestTypeId
      },
      {
        campo: 'RefScoreMetricTypeId',
        nuevo: escalaId,
        anterior: assessment.RefScoreMetricTypeId,
        campoTexto: 'Escala',
        textoNuevo: descripcionMap.RefScoreMetricTypeId,
        textoAnterior: anteriorMap.RefScoreMetricTypeId
      },
      {
        campo: 'WeightPercent',
        nuevo: ponderacion,
        anterior: assessment.WeightPercent,
        campoTexto: 'Ponderación'
      },
      {
        campo: 'Tier',
        nuevo: excluirPromedio,
        anterior: assessment.Tier,
        campoTexto: 'No influye en promedio',
        textoNuevo: excluirPromedio ? 'Sí' : 'No',
        textoAnterior: assessment.Tier ? 'Sí' : 'No'
      },
      {
        campo: 'AssessmentRevisionDate',
        nuevo: fecha,
        anterior: assessment.AssessmentRevisionDate?.toISOString().split('T')[0],
        campoTexto: 'Fecha evaluación'
      }
    ];

    for (const { campo, nuevo, anterior, campoTexto, textoNuevo, textoAnterior } of campos) {
      if (String(nuevo) !== String(anterior)) {
        await pool.request()
          .input('Modulo', sql.NVarChar(50), 'notas')
          .input('TablaAfectada', sql.NVarChar(100), 'Assessment')
          .input('RegistroId', sql.Int, assessmentId)
          .input('CampoAfectado', sql.NVarChar(100), campo)
          .input('CampoAfectadoTexto', sql.NVarChar(100), campoTexto)
          .input('ValorAnterior', sql.NVarChar(sql.MAX), anterior)
          .input('ValorNuevo', sql.NVarChar(sql.MAX), nuevo)
          .input('ValorAnteriorTexto', sql.NVarChar(sql.MAX), textoAnterior || anterior)
          .input('ValorNuevoTexto', sql.NVarChar(sql.MAX), textoNuevo || nuevo)
          .input('UsuarioId', sql.Int, usuarioId)
          .query(`
            INSERT INTO AssessmentChangeLog (
              Modulo, TablaAfectada, RegistroId, CampoAfectado, CampoAfectadoTexto,
              ValorAnterior, ValorNuevo, ValorAnteriorTexto, ValorNuevoTexto, UsuarioId
            )
            VALUES (
              @Modulo, @TablaAfectada, @RegistroId, @CampoAfectado, @CampoAfectadoTexto,
              @ValorAnterior, @ValorNuevo, @ValorAnteriorTexto, @ValorNuevoTexto, @UsuarioId
            )
          `);
      }
    }

    // ================= ACTUALIZACIÓN =================
    await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .input('title', sql.VarChar(100), title)
      .input('descripcion', sql.VarChar(sql.MAX), descripcion)
      .input('tipoEvaluacionId', sql.Int, tipoEvaluacionId)
      .input('tipoNotaId', sql.Int, tipoNotaId)
      .input('escalaId', sql.Int, escalaId)
      .input('ponderacion', sql.Float, ponderacion)
      .input('excluirPromedio', sql.Int, excluirPromedio)
      .input('fecha', sql.Date, fecha)
      .query(`
        UPDATE Assessment
        SET Title = @title,
            Objective = @descripcion,
            RefAssessmentTypeId = @tipoEvaluacionId,
            RefAssessmentSubtestTypeId = @tipoNotaId,
            RefScoreMetricTypeId = @escalaId,
            WeightPercent = @ponderacion,
            Tier = @excluirPromedio,
            AssessmentRevisionDate = @fecha
        WHERE AssessmentId = @assessmentId
      `);

    // ================= OA =================
    await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`DELETE FROM AssessmentObjective WHERE AssessmentId = @assessmentId`);

    if (objetivos && objetivos.length > 0) {
      for (const oaId of objetivos) {
        await pool.request()
          .input('assessmentId', sql.Int, assessmentId)
          .input('oaId', sql.Int, oaId)
          .input('usuarioId', sql.Int, usuarioId)
          .query(`
            INSERT INTO AssessmentObjective (AssessmentId, LearningObjectiveId, UsuarioId)
            VALUES (@assessmentId, @oaId, @usuarioId)
          `);
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('========== [BACKEND] Error en configurarColumna ==========');
    console.error(error);
    res.status(500).json({ error: error.message || 'Error interno al guardar configuración de columna.' });
  }
};




// ================= FUNCIÓN AUXILIAR =================
async function getDescripcion(pool, tabla, idField, idValor) {
  if (!idValor) return null;
  const result = await pool.request()
    .input('id', sql.Int, idValor)
    .query(`SELECT Description FROM ${tabla} WHERE ${idField} = @id`);
  return result.recordset[0]?.Description || null;
}

// GET /api/notas/configurar-columna/:assessmentId/:identifier
exports.obtenerConfiguracionColumna = async (req, res) => {
  const { assessmentId } = req.params;

  try {
    // Si el assessmentId comienza con 'temp-', es un ID temporal del frontend
    if (assessmentId.toString().startsWith('temp-')) {
      console.log(`[OBTENER_CONFIG] ID temporal detectado: ${assessmentId}. Devolviendo configuración vacía.`);
      
      // Formatear la fecha actual al formato YYYY-MM-DD para el input type="date" HTML
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const dia = fecha.getDate().toString().padStart(2, '0');
      const fechaFormateada = `${anio}-${mes}-${dia}`;
      console.log(`[OBTENER_CONFIG] Fecha formateada para ID temporal: ${fechaFormateada}`);
      
      // Devolver una configuración por defecto para IDs temporales
      return res.status(200).json({
        AssessmentId: assessmentId,
        Identifier: assessmentId.split('-')[1] || 'N1',
        Title: null,
        Description: `Nueva columna ${assessmentId.split('-')[1] || 'N1'}`,
        RefAssessmentPurposeId: 28, // Formativa por defecto
        AssessmentPurposeDescription: 'Formativa',
        RefAssessmentSubtestTypeId: 1,
        RefScoreMetricTypeId: 31,
        WeightPercent: null,
        VisualNoteType: '1',
        Tier: null,
        PublishedDate: fechaFormateada,
        objetivos: []
      });
    }

    const pool = await poolPromise;

    console.log(`[OBTENER_CONFIG] Buscando configuración para assessmentId: ${assessmentId}`);

    const result = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT 
          A.AssessmentId,
          A.Identifier,
          A.Title,
          A.Objective AS Description,                       -- ⚠️ alias para mantener compatibilidad
          A.RefAssessmentTypeId AS RefAssessmentPurposeId,  -- ⚠️ como espera el frontend
          RAT.Description AS AssessmentPurposeDescription,  -- ✅ para mostrar "Formativa", "Sumativa", etc.
          A.RefAssessmentSubtestTypeId,
          A.RefScoreMetricTypeId,
          A.WeightPercent,
          A.VisualNoteType,
          A.Tier,
          A.AssessmentRevisionDate AS PublishedDate         -- ⚠️ alias para compatibilidad frontend
        FROM Assessment A
        LEFT JOIN RefAssessmentType RAT ON A.RefAssessmentTypeId = RAT.RefAssessmentTypeId
        WHERE A.AssessmentId = @assessmentId
      `);

    if (result.recordset.length === 0) {
      console.log(`[OBTENER_CONFIG] No se encontró configuración para assessmentId: ${assessmentId}`);
      return res.status(404).json({ error: 'No se encontró configuración para la columna indicada.' });
    }

    const configuracion = result.recordset[0];
    console.log(`[OBTENER_CONFIG] Configuración encontrada:`, configuracion);

    // Formatear la fecha PublishedDate al formato YYYY-MM-DD para el input type="date" HTML
    if (configuracion.PublishedDate) {
      const fecha = new Date(configuracion.PublishedDate);
      const anio = fecha.getFullYear();
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const dia = fecha.getDate().toString().padStart(2, '0');
      configuracion.PublishedDate = `${anio}-${mes}-${dia}`;
      console.log(`[OBTENER_CONFIG] Fecha formateada para input date HTML: ${configuracion.PublishedDate}`);
    }

    // Obtener OAs desde la nueva tabla correcta: AssessmentObjective
    const objetivosResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AO.LearningObjectiveId, LO.ObjectiveCode, LO.ObjectiveDescription
        FROM AssessmentObjective AO
        INNER JOIN LearningObjective LO ON AO.LearningObjectiveId = LO.LearningObjectiveId
        WHERE AO.AssessmentId = @assessmentId
      `);

    const configuracionCompleta = {
      ...configuracion,
      objetivos: objetivosResult.recordset
    };

    console.log(`[OBTENER_CONFIG] Enviando configuración completa:`, configuracionCompleta);
    res.status(200).json(configuracionCompleta);

  } catch (error) {
    console.error('[ERROR] obtenerConfiguracionColumna:', error);
    res.status(500).json({ error: 'Error al obtener configuración de columna.' });
  }
};









// POST /api/notas/log-cambio-columna
exports.logCambioColumna = async (req, res) => {
  const {
    assessmentId,
    campo,
    valorAnterior,
    valorNuevo,
    usuarioId,
    campoDescripcion,
    valorAnteriorDescripcion,
    valorNuevoDescripcion
  } = req.body;

  try {
    const pool = await poolPromise;

    if (!assessmentId) {
      return res.status(400).json({ error: 'assessmentId es requerido.' });
    }

    const mapeoVisualizacion = {
      'Nota': 1,
      'Porcentaje': 2,
      'Concepto': 3
    };

    const valorAnteriorNumerico = mapeoVisualizacion[valorAnteriorDescripcion] || mapeoVisualizacion[valorAnterior] || 1;
    const valorNuevoNumerico = mapeoVisualizacion[valorNuevoDescripcion] || mapeoVisualizacion[valorNuevo] || 1;

    // Verificar que existe el Assessment
    const assessmentResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentId, VisualNoteType
        FROM Assessment
        WHERE AssessmentId = @assessmentId
      `);

    if (assessmentResult.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró la evaluación indicada.' });
    }

    // === CAMBIO DE VISUALIZACIÓN ===
    if (campo === 'VisualNoteType' || campo === 'TipoVisualizacion') {
      // Actualizar solo Assessment.VisualNoteType
      await pool.request()
        .input('assessmentId', sql.Int, assessmentId)
        .input('visualNoteType', sql.Int, valorNuevoNumerico)
        .query(`
          UPDATE Assessment
          SET VisualNoteType = @visualNoteType
          WHERE AssessmentId = @assessmentId
        `);

      // Registrar en log solo para Assessment
      await pool.request()
        .input('Modulo', sql.NVarChar(50), 'notas')
        .input('TablaAfectada', sql.NVarChar(100), 'Assessment')
        .input('RegistroId', sql.Int, assessmentId)
        .input('CampoAfectado', sql.NVarChar(100), 'VisualNoteType')
        .input('CampoAfectadoTexto', sql.NVarChar(255), campoDescripcion)
        .input('ValorAnterior', sql.NVarChar(sql.MAX), String(valorAnteriorNumerico))
        .input('ValorNuevo', sql.NVarChar(sql.MAX), String(valorNuevoNumerico))
        .input('ValorAnteriorTexto', sql.NVarChar(255), valorAnteriorDescripcion)
        .input('ValorNuevoTexto', sql.NVarChar(255), valorNuevoDescripcion)
        .input('UsuarioId', sql.Int, usuarioId)
        .query(`
          INSERT INTO AssessmentChangeLog (
            Modulo, TablaAfectada, RegistroId, CampoAfectado,
            ValorAnterior, ValorNuevo, CampoAfectadoTexto,
            ValorAnteriorTexto, ValorNuevoTexto,
            UsuarioId, FechaCambio
          )
          VALUES (
            @Modulo, @TablaAfectada, @RegistroId, @CampoAfectado,
            @ValorAnterior, @ValorNuevo, @CampoAfectadoTexto,
            @ValorAnteriorTexto, @ValorNuevoTexto,
            @UsuarioId, GETDATE()
          )
        `);
    } else {
      // Otros cambios futuros (si se requiere)
      await pool.request()
        .input('Modulo', sql.NVarChar(50), 'notas')
        .input('TablaAfectada', sql.NVarChar(100), 'Assessment')
        .input('RegistroId', sql.Int, assessmentId)
        .input('CampoAfectado', sql.NVarChar(100), campo)
        .input('CampoAfectadoTexto', sql.NVarChar(255), campoDescripcion)
        .input('ValorAnterior', sql.NVarChar(sql.MAX), String(valorAnterior || ''))
        .input('ValorNuevo', sql.NVarChar(sql.MAX), String(valorNuevo || ''))
        .input('ValorAnteriorTexto', sql.NVarChar(255), valorAnteriorDescripcion || valorAnterior)
        .input('ValorNuevoTexto', sql.NVarChar(255), valorNuevoDescripcion || valorNuevo)
        .input('UsuarioId', sql.Int, usuarioId)
        .query(`
          INSERT INTO AssessmentChangeLog (
            Modulo, TablaAfectada, RegistroId, CampoAfectado,
            ValorAnterior, ValorNuevo, CampoAfectadoTexto,
            ValorAnteriorTexto, ValorNuevoTexto,
            UsuarioId, FechaCambio
          )
          VALUES (
            @Modulo, @TablaAfectada, @RegistroId, @CampoAfectado,
            @ValorAnterior, @ValorNuevo, @CampoAfectadoTexto,
            @ValorAnteriorTexto, @ValorNuevoTexto,
            @UsuarioId, GETDATE()
          )
        `);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('[ERROR] Error al registrar cambio de columna:', error);
    res.status(500).json({ error: 'Error al registrar cambio de columna.' });
  }
};





//aqui

//****************BACK PARA ACUMULATIVA

// POST /api/notas/notas-acumuladas/guardar
exports.guardarNotasAcumuladas = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  let notasInsertadas = 0;
  let promediosInsertados = 0;
  let registrosOmitidos = 0;
  let registrosCreados = 0;
  let gruposCreados = 0;

  try {
    const { assessmentId, subnotas, fecha, cursoId, asignaturaId } = req.body;

    console.log('[GUARDAR_ACUMULATIVA] Iniciando con datos:', {
      assessmentId,
      fecha,
      cursoId,
      asignaturaId,
      subnotas: Array.isArray(subnotas) ? subnotas.length : 'no es array'
    });
    console.log('[GUARDAR_ACUMULATIVA] Payload subnotas detallado (primeros 5 alumnos):', JSON.stringify(subnotas.slice(0, 5))); // Log solo los primeros para evitar logs muy largos
    
    // Verificar si hay identifiers en las subnotas
    const tieneIdentifiers = subnotas.some(subnota => 
      subnota.identifiers && Array.isArray(subnota.identifiers) && subnota.identifiers.length > 0
    );
    
    console.log(`[GUARDAR_ACUMULATIVA] ¿Tiene identifiers en las subnotas? ${tieneIdentifiers}`);
    
    if (tieneIdentifiers) {
      console.log('[GUARDAR_ACUMULATIVA] Identifiers encontrados en las subnotas:', 
        subnotas.map(s => s.identifiers).filter(Boolean)[0]
      );
    }

    if (!assessmentId || !Array.isArray(subnotas) || !cursoId || !asignaturaId) {
      console.error('[GUARDAR_ACUMULATIVA] Parámetros inválidos recibidos');
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    await transaction.begin();

    // Obtener o crear AssessmentAdministrationId (Lógica existente, parece correcta)
    const adminResult = await new sql.Request(transaction)
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);

    let assessmentAdministrationId;

    if (adminResult.recordset.length === 0) {
      console.log(`[GUARDAR_ACUMULATIVA] No se encontró AssessmentAdministrationId, intentando encontrar huérfana o creando nueva`);

      // Intentar encontrar una AssessmentAdministration que no esté ligada a Assessment_AssessmentAdministration
       const orphanAdminResult = await new sql.Request(transaction)
        .query(`
          SELECT TOP 1 aa.AssessmentAdministrationId
          FROM AssessmentAdministration aa
          LEFT JOIN Assessment_AssessmentAdministration aaa ON aa.AssessmentAdministrationId = aaa.AssessmentAdministrationId
          WHERE aaa.AssessmentId IS NULL -- Buscar admins sin un enlace de Assessment_AssessmentAdministration
        `);

       if(orphanAdminResult.recordset.length > 0) {
           assessmentAdministrationId = orphanAdminResult.recordset[0].AssessmentAdministrationId;
           console.log(`[GUARDAR_ACUMULATIVA] Encontrada AssessmentAdministrationId huérfana: ${assessmentAdministrationId}. Creando enlace.`);
            // Crear la relación Assessment_AssessmentAdministration
            await new sql.Request(transaction)
            .input('assessmentId', sql.Int, assessmentId)
            .input('adminId', sql.Int, assessmentAdministrationId)
            .query(`
                INSERT INTO Assessment_AssessmentAdministration (AssessmentId, AssessmentAdministrationId)
                VALUES (@assessmentId, @adminId)
            `);
       } else {
           console.log(`[GUARDAR_ACUMULATIVA] No se encontró AssessmentAdministrationId huérfana, creando nueva Admin y enlace.`);
            const insertAdminResult = await new sql.Request(transaction)
              .input('fecha', sql.Date, fecha || new Date())
              .query(`
                INSERT INTO AssessmentAdministration (AdministrationDate)
                OUTPUT INSERTED.AssessmentAdministrationId
                VALUES (@fecha)
              `);

            if (insertAdminResult.recordset.length > 0) {
              assessmentAdministrationId = insertAdminResult.recordset[0].AssessmentAdministrationId;

              // Crear la relación Assessment_AssessmentAdministration
              await new sql.Request(transaction)
                .input('assessmentId', sql.Int, assessmentId)
                .input('adminId', sql.Int, assessmentAdministrationId)
                .query(`
                  INSERT INTO Assessment_AssessmentAdministration (AssessmentId, AssessmentAdministrationId)
                  VALUES (@assessmentId, @adminId)
                `);

              console.log(`[GUARDAR_ACUMULATIVA] Creado nuevo AssessmentAdministrationId: ${assessmentAdministrationId}`);
            } else {
              console.error('[GUARDAR_ACUMULATIVA] No se pudo crear AssessmentAdministration');
              await transaction.rollback();
              return res.status(500).json({ error: 'No se pudo crear AssessmentAdministration' });
            }
       }
    } else {
      assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
      console.log(`[GUARDAR_ACUMULATIVA] Usando AssessmentAdministrationId existente: ${assessmentAdministrationId}`);
    }

    // --- MODIFICACIÓN CLAVE 1: Obtener los AssessmentSubtestId y Identifiers correctos y ORDENADOS ---
    const subtestResult = await new sql.Request(transaction)
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT ast.AssessmentSubtestId, ast.Identifier
        FROM AssessmentSubtest ast
        INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
        WHERE af.AssessmentId = @assessmentId
        ORDER BY ast.Identifier -- Ordenar por Identifier para asegurar consistencia con el frontend
      `);

    const subtestMap = {}; // Mapa para buscar AssessmentSubtestId por Identifier
    const subtestIdentifiersOrdenados = []; // Array ordenado de Identifiers

    if (subtestResult.recordset.length > 0) {
        subtestResult.recordset.forEach(r => {
            subtestMap[r.Identifier] = r.AssessmentSubtestId;
            subtestIdentifiersOrdenados.push(r.Identifier);
        });
        console.log(`[GUARDAR_ACUMULATIVA] AssessmentSubtests encontrados para el guardado:`, subtestResult.recordset);
    } else {
         console.warn(`[GUARDAR_ACUMULATIVA] No se encontraron AssessmentSubtests para assessmentId: ${assessmentId}. Esto es inesperado para una nota acumulativa.`);
    }

    // Procesar cada alumno
    for (const alumno of subnotas) {
      let registrationId = alumno.assessmentRegistrationId;
      const personId = alumno.personId;
      const organizationPersonRoleId = alumno.organizationPersonRoleId;

      console.log(`[GUARDAR_ACUMULATIVA] Procesando alumno:`, {
        personId,
        organizationPersonRoleId,
        notasRecibidas: Array.isArray(alumno.notas) ? alumno.notas.length : 'no es array',
        promedioRecibido: alumno.promedio,
        registrationIdRecibido: registrationId
      });

      // >>> MODIFICACIÓN AQUÍ: Buscar o crear AssessmentRegistration si no viene en el payload <<<
      if (!registrationId || isNaN(registrationId)) {
        console.log(`[GUARDAR_ACUMULATIVA] registrationId nulo o inválido para PersonId ${personId}. Buscando o creando.`);

        if (!personId || !organizationPersonRoleId || !cursoId || !asignaturaId || !assessmentAdministrationId) {
          console.error(`[GUARDAR_ACUMULATIVA] Omitido: Datos insuficientes (personId, organizationPersonRoleId, cursoId, asignaturaId o assessmentAdministrationId faltantes) para buscar/crear AssessmentRegistration para alumno:`, alumno);
          registrosOmitidos++;
          continue; // No se puede procesar sin datos esenciales
        }

        try {
          // 1. Intentar encontrar un AssessmentRegistration existente para esta persona en esta administración
          const checkRegResult = await new sql.Request(transaction)
            .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
            .input('personId', sql.Int, personId)
            .input('cursoId', sql.Int, cursoId)
            .input('asignaturaId', sql.Int, asignaturaId)
            .query(`
              SELECT AssessmentRegistrationId
              FROM AssessmentRegistration
              WHERE AssessmentAdministrationId = @assessmentAdministrationId
                AND PersonId = @personId
                AND OrganizationId = @cursoId
                AND CourseSectionOrganizationId = @asignaturaId
            `);

          if (checkRegResult.recordset.length > 0) {
            registrationId = checkRegResult.recordset[0].AssessmentRegistrationId;
            console.log(`[GUARDAR_ACUMULATIVA] AssessmentRegistrationId existente encontrado: ${registrationId}`);
          } else {
            // 2. Si no existe, crear un nuevo registro de inscripción
            console.log(`[GUARDAR_ACUMULATIVA] No se encontró AssessmentRegistrationId existente. Creando nuevo para PersonId ${personId}.`);
            const insertResult = await new sql.Request(transaction)
              .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
              .input('personId', sql.Int, personId)
              .input('cursoId', sql.Int, cursoId)
              .input('asignaturaId', sql.Int, asignaturaId)
              .input('organizationPersonRoleId', sql.Int, organizationPersonRoleId)
              .query(`
                INSERT INTO AssessmentRegistration (
                  AssessmentAdministrationId,
                  PersonId,
                  OrganizationId,
                  CourseSectionOrganizationId,
                  OrganizationPersonRoleId,
                  CreationDate
                )
                OUTPUT INSERTED.AssessmentRegistrationId
                VALUES (
                  @assessmentAdministrationId,
                  @personId,
                  @cursoId,
                  @asignaturaId,
                  @organizationPersonRoleId,
                  GETDATE()
                )
              `);

            if (insertResult.recordset.length > 0) {
              registrationId = insertResult.recordset[0].AssessmentRegistrationId;
              console.log(`[GUARDAR_ACUMULATIVA] Creado nuevo AssessmentRegistrationId: ${registrationId}`);
              registrosCreados++;
            } else {
              console.error(`[ERROR] No se pudo crear AssessmentRegistration para PersonId: ${personId}`);
              registrosOmitidos++;
              continue;
            }
          }
        } catch (regError) {
          console.error(`[ERROR] Error al buscar/crear AssessmentRegistration para PersonId ${personId}:`, regError);
          registrosOmitidos++;
          continue;
        }
      }

      // Verificar nuevamente si el registrationId es válido después de intentar buscar/crear
      if (!registrationId || isNaN(registrationId)) {
        console.warn(`[GUARDAR_ACUMULATIVA] Omitido: registrationId sigue siendo inválido después de buscar/crear para alumno:`, alumno);
        registrosOmitidos++;
        continue;
      }

      // NUEVA IMPLEMENTACIÓN: Crear un AssessmentResultGroup para este conjunto de subnotas
      let assessmentResultGroupId;
      try {
        // Verificar que el assessment sea de tipo acumulativa
        const checkTipoResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .query(`
            SELECT RefAssessmentSubtestTypeId
            FROM Assessment
            WHERE AssessmentId = @assessmentId
          `);
        
        const tipoColumna = checkTipoResult.recordset[0]?.RefAssessmentSubtestTypeId;
        console.log(`[GUARDAR_ACUMULATIVA] Tipo de columna verificado: ${tipoColumna}`);
        
        if (tipoColumna !== 2) {
          console.warn(`[GUARDAR_ACUMULATIVA] El AssessmentId ${assessmentId} no está configurado como tipo acumulativa (2), sino como tipo ${tipoColumna}`);
        }
        
        // Crear un nuevo grupo para esta evaluación
        console.log('[DEBUG] Intentando crear AssessmentResultGroup con datos:', {
          assessmentId,
          registrationId,
          description: `Grupo de notas acumulativas para AssessmentId ${assessmentId}`
        });
        
        const insertGroupResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .input('registrationId', sql.Int, registrationId)
          .input('description', sql.NVarChar, `Grupo de notas acumulativas para AssessmentId ${assessmentId}`)
          .input('fecha', sql.DateTime, fecha || new Date())
          .query(`
            INSERT INTO AssessmentResultGroup (
              AssessmentId,
              AssessmentRegistrationId,
              Description,
              CreationDate
            )
            OUTPUT INSERTED.AssessmentResultGroupId
            VALUES (
              @assessmentId,
              @registrationId,
              @description,
              @fecha
            )
          `);
		  
		  console.log('[DEBUG] Resultado de inserción de grupo:', insertGroupResult);

        if (insertGroupResult.recordset.length > 0) {
          assessmentResultGroupId = insertGroupResult.recordset[0].AssessmentResultGroupId;
          console.log(`[GUARDAR_ACUMULATIVA] Creado nuevo AssessmentResultGroupId: ${assessmentResultGroupId}`);
          gruposCreados++;
        } else {
          console.error(`[ERROR] No se pudo crear AssessmentResultGroup para registrationId: ${registrationId}`);
          // Continuamos sin grupo (modo de compatibilidad)
        }
      } catch (groupError) {
        console.error(`[ERROR] Error al crear AssessmentResultGroup:`, groupError);
        // Continuamos sin grupo (modo de compatibilidad)
      }

      // 3. Eliminar TODAS las notas previas relacionadas con este registro y estos subtests
      if (subtestIdentifiersOrdenados.length > 0) {
        // Si tenemos un grupo, eliminamos por grupo
        if (assessmentResultGroupId) {
          await new sql.Request(transaction)
            .input('groupId', sql.Int, assessmentResultGroupId)
            .query(`
              DELETE FROM AssessmentResult
              WHERE AssessmentResultGroupId = @groupId
            `);
          console.log(`[GUARDAR_ACUMULATIVA] Notas acumulativas previas eliminadas para groupId: ${assessmentResultGroupId}`);
        } else {
          // Modo de compatibilidad: eliminar por registrationId y subtestIds
          await new sql.Request(transaction)
            .input('registrationId', sql.Int, registrationId)
            .query(`
              DELETE FROM AssessmentResult
              WHERE AssessmentRegistrationId = @registrationId
              AND AssessmentSubtestId IN (${Object.values(subtestMap).join(',')})
              AND IsAverage = 0
            `);
          console.log(`[GUARDAR_ACUMULATIVA] Notas acumulativas previas (subnotas) eliminadas para registrationId: ${registrationId}`);
        }
      } else {
        console.log(`[GUARDAR_ACUMULATIVA] No hay subtestIds para eliminar notas previas para registrationId: ${registrationId}`);
      }

      // 4. Insertar subnotas individuales
      let notasValidas = 0;
      let sumaNotas = 0;

      if (Array.isArray(alumno.notas) && alumno.notas.length > 0) {
        console.log(`[DEBUG] Intentando insertar ${alumno.notas.length} subnotas para ${registrationId}.`);
        
        // Verificar si el alumno tiene identifiers específicos
        const useCustomIdentifiers = alumno.identifiers && Array.isArray(alumno.identifiers) && alumno.identifiers.length > 0;
        
        if (useCustomIdentifiers) {
          console.log(`[DEBUG] Usando identifiers personalizados del alumno: ${alumno.identifiers.join(', ')}`);
        } else if (subtestIdentifiersOrdenados.length > 0) {
          console.log(`[DEBUG] Usando identifiers del sistema: ${subtestIdentifiersOrdenados.join(', ')}`);
        } else {
          console.log(`[DEBUG] No hay identifiers disponibles. Se generarán automáticamente.`);
        }
        
        // Si el alumno tiene pesos, asegurarse de que se usen para el cálculo del promedio
        if (alumno.pesos && Array.isArray(alumno.pesos)) {
          console.log(`[DEBUG] Pesos recibidos del alumno: ${alumno.pesos.join(', ')}`);
        }

        // --- MODIFICACIÓN CLAVE 2: Mapear notas del alumno a los AssessmentSubtestId correctos ---
        for (let i = 0; i < alumno.notas.length; i++) {
          const score = alumno.notas[i];
          
          // Usar identifier del alumno si está disponible, de lo contrario usar del sistema o generar uno
          let identifier;
          if (useCustomIdentifiers && i < alumno.identifiers.length) {
            identifier = alumno.identifiers[i];
          } else if (i < subtestIdentifiersOrdenados.length) {
            identifier = subtestIdentifiersOrdenados[i];
          } else {
            identifier = `SUB${i+1}`;
          }
          
          const subtestId = subtestMap[identifier]; // Obtener el AssessmentSubtestId usando el mapa

          // Asegurar que la nota es numérica y no vacía/nula
          if (score !== null && score !== undefined && score !== '' && !isNaN(parseFloat(score))) {
            const notaRedondeada = Math.round(parseFloat(score) * 10) / 10;

            if (subtestId !== undefined && subtestId !== null) {
              console.log(`[DEBUG] Insertando subnota: regId=${registrationId}, subtestId=${subtestId} (${identifier}), nota=${notaRedondeada}`);

              try {
                // Insertar nuevo registro de subnota CON AssessmentResultGroupId
                const insertQuery = assessmentResultGroupId ? 
                  `INSERT INTO AssessmentResult
                  (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated, AssessmentResultGroupId)
                  VALUES (@RegId, @SubtestId, @Nota, 0, @Fecha, @GroupId)` :
                  `INSERT INTO AssessmentResult
                  (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated)
                  VALUES (@RegId, @SubtestId, @Nota, 0, @Fecha)`;

                const request = new sql.Request(transaction)
                  .input('RegId', sql.Int, registrationId)
                  .input('SubtestId', sql.Int, subtestId)
                  .input('Nota', sql.Decimal(4, 1), notaRedondeada)
                  .input('Fecha', sql.DateTime, fecha || new Date());

                if (assessmentResultGroupId) {
                  request.input('GroupId', sql.Int, assessmentResultGroupId);
                }

                await request.query(insertQuery);

                console.log(`[GUARDAR_ACUMULATIVA] Subnota insertada exitosamente para ${registrationId}, subtestId ${subtestId} (${identifier})`);
                notasInsertadas++;
                notasValidas++;
                sumaNotas += notaRedondeada;
                
              } catch (insertError) {
                console.error(`[ERROR] Error al insertar subnota en BD para registrationId ${registrationId}, subtestId ${subtestId} (${identifier}):`, insertError);
              }
            } else {
              // Si no existe el subtestId, intentamos crear el AssessmentSubtest
              console.log(`[INFO] No se encontró AssessmentSubtestId para identifier ${identifier}. Intentando crear AssessmentSubtest.`);
              
              try {
                // 1. Buscar o crear AssessmentForm para este Assessment
                const formResult = await new sql.Request(transaction)
                  .input('assessmentId', sql.Int, assessmentId)
                  .query(`
                    SELECT AssessmentFormId FROM AssessmentForm 
                    WHERE AssessmentId = @assessmentId
                  `);
                
                let assessmentFormId;
                
                if (formResult.recordset.length > 0) {
                  assessmentFormId = formResult.recordset[0].AssessmentFormId;
                  console.log(`[INFO] AssessmentFormId existente encontrado: ${assessmentFormId}`);
                } else {
                  // Crear un nuevo AssessmentForm
                  const newFormResult = await new sql.Request(transaction)
                    .input('assessmentId', sql.Int, assessmentId)
                    .input('title', sql.NVarChar, `Form for ${assessmentId}`)
                    .query(`
                      INSERT INTO AssessmentForm (AssessmentId, Title)
                      OUTPUT INSERTED.AssessmentFormId
                      VALUES (@assessmentId, @title)
                    `);
                  
                  if (newFormResult.recordset.length > 0) {
                    assessmentFormId = newFormResult.recordset[0].AssessmentFormId;
                    console.log(`[INFO] Nuevo AssessmentFormId creado: ${assessmentFormId}`);
                  } else {
                    throw new Error('No se pudo crear AssessmentForm');
                  }
                }
                
                // 2. Crear el AssessmentSubtest
                const newSubtestResult = await new sql.Request(transaction)
                  .input('formId', sql.Int, assessmentFormId)
                  .input('identifier', sql.NVarChar, identifier)
                  .input('title', sql.NVarChar, `Subtest ${identifier}`)
                  .query(`
                    INSERT INTO AssessmentSubtest (
                      AssessmentFormId, Identifier, Title, 
                      RefAssessmentSubtestTypeId, MinimumScore, MaximumScore
                    )
                    OUTPUT INSERTED.AssessmentSubtestId
                    VALUES (
                      @formId, @identifier, @title, 
                      1, 1.0, 7.0
                    )
                  `);
                
                if (newSubtestResult.recordset.length > 0) {
                  const newSubtestId = newSubtestResult.recordset[0].AssessmentSubtestId;
                  console.log(`[INFO] Nuevo AssessmentSubtestId creado: ${newSubtestId} para identifier ${identifier}`);
                  
                  // Actualizar el mapa y el array de identifiers
                  subtestMap[identifier] = newSubtestId;
                  if (!subtestIdentifiersOrdenados.includes(identifier)) {
                    subtestIdentifiersOrdenados.push(identifier);
                  }
                  
                  // Ahora insertamos la nota con el nuevo subtestId y grupo si existe
                  const insertQuery = assessmentResultGroupId ? 
                    `INSERT INTO AssessmentResult
                    (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated, AssessmentResultGroupId)
                    VALUES (@RegId, @SubtestId, @Nota, 0, @Fecha, @GroupId)` :
                    `INSERT INTO AssessmentResult
                    (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated)
                    VALUES (@RegId, @SubtestId, @Nota, 0, @Fecha)`;

                  const request = new sql.Request(transaction)
                    .input('RegId', sql.Int, registrationId)
                    .input('SubtestId', sql.Int, newSubtestId)
                    .input('Nota', sql.Decimal(4, 1), notaRedondeada)
                    .input('Fecha', sql.DateTime, fecha || new Date());

                  if (assessmentResultGroupId) {
                    request.input('GroupId', sql.Int, assessmentResultGroupId);
                  }

                  await request.query(insertQuery);
                  
                  console.log(`[GUARDAR_ACUMULATIVA] Subnota insertada exitosamente con nuevo subtestId ${newSubtestId} para ${registrationId}`);
                  notasInsertadas++;
                  notasValidas++;
                  sumaNotas += notaRedondeada;
                } else {
                  throw new Error('No se pudo crear AssessmentSubtest');
                }
              } catch (createSubtestError) {
                console.error(`[ERROR] Error al crear AssessmentSubtest para identifier ${identifier}:`, createSubtestError);
              }
            }
          } else {
            console.warn(`[GUARDAR_ACUMULATIVA] Nota inválida u omitida para registrationId ${registrationId}, subcolumna índice ${i} (${identifier}):`, score);
          }
        }
      } else {
        console.warn(`[GUARDAR_ACUMULATIVA] No hay notas en el payload del alumno o no hay subtests definidos para registrationId ${registrationId}.`);
      }

      // 5. Calcular e insertar/actualizar promedio (Nota principal acumulativa)
      let promedioCalculado = 0;
      if (notasValidas > 0) {
        // Calcular promedio ponderado si hay pesos disponibles
        let sumaPonderada = 0;
        let sumaPesos = 0;
        
        if (Array.isArray(alumno.notas) && Array.isArray(alumno.pesos) && alumno.notas.length === alumno.pesos.length) {
          console.log(`[DEBUG] Calculando promedio ponderado para registrationId ${registrationId}`);
          // Asegurarse de iterar solo hasta el número de notas/pesos o subtests disponibles
          for (let i = 0; i < Math.min(alumno.notas.length, alumno.pesos.length, subtestIdentifiersOrdenados.length); i++) {
            const score = alumno.notas[i];
            const peso = parseFloat(alumno.pesos[i]);
            const notaNum = (score !== null && score !== undefined && score !== '' && !isNaN(parseFloat(score))) ? parseFloat(score) : null;
            
            if (notaNum !== null && !isNaN(peso)) {
              sumaPonderada += (notaNum * peso);
              sumaPesos += peso;
            }
          }

          if (sumaPesos > 0) {
            promedioCalculado = Math.round((sumaPonderada / sumaPesos) * 10) / 10;
          } else {
            promedioCalculado = 0;
          }
          console.log(`[DEBUG] Suma ponderada: ${sumaPonderada}, Suma pesos: ${sumaPesos}, Promedio calculado: ${promedioCalculado}`);
        } else {
          // Calcular promedio simple si no hay pesos válidos
          console.warn(`[WARN] No se pudieron usar pesos válidos para calcular promedio ponderado para registrationId ${registrationId}. Calculando promedio simple.`);
          if (notasValidas > 0) {
            promedioCalculado = Math.round((sumaNotas / notasValidas) * 10) / 10;
          } else {
            promedioCalculado = 0;
          }
        }
      } else {
        console.log(`[GUARDAR_ACUMULATIVA] No hay notas válidas para calcular promedio para registrationId ${registrationId}. Promedio será 0.`);
      }

      // Usar el promedio recibido del frontend si es válido, de lo contrario, usar el calculado
      const promedioFinal = (alumno.promedio !== null && alumno.promedio !== undefined && alumno.promedio !== '' && !isNaN(parseFloat(alumno.promedio)))
        ? Math.round(parseFloat(alumno.promedio) * 10) / 10
        : promedioCalculado;

      console.log(`[DEBUG] Promedio calculado: ${promedioCalculado}, Promedio recibido: ${alumno.promedio}, Promedio final a guardar: ${promedioFinal}`);

      // Eliminar cualquier registro de promedio existente
      await new sql.Request(transaction)
        .input('registrationId', sql.Int, registrationId)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          DELETE ar FROM AssessmentResult ar
          INNER JOIN AssessmentRegistration reg ON ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
          INNER JOIN AssessmentAdministration aa ON reg.AssessmentAdministrationId = aa.AssessmentAdministrationId
          INNER JOIN Assessment_AssessmentAdministration aaa ON aa.AssessmentAdministrationId = aaa.AssessmentAdministrationId
          WHERE ar.AssessmentRegistrationId = @registrationId
            AND aaa.AssessmentId = @assessmentId
            AND ar.IsAverage = 1
        `);


      console.log(`[GUARDAR_ACUMULATIVA] Promedio previo eliminado (si existía) para registrationId: ${registrationId}`);

      // 5.1. Insertar el nuevo promedio
      try {
        // Insertar promedio con o sin grupo
        const insertQuery = assessmentResultGroupId ? 
          `INSERT INTO AssessmentResult
          (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated, AssessmentResultGroupId)
          VALUES (@regId, NULL, @promedio, 1, @Fecha, @GroupId)` :
          `INSERT INTO AssessmentResult
          (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated)
          VALUES (@regId, NULL, @promedio, 1, @Fecha)`;

        const request = new sql.Request(transaction)
          .input('regId', sql.Int, registrationId)
          .input('promedio', sql.Decimal(4, 1), promedioFinal)
          .input('fecha', sql.DateTime, fecha || new Date());

        if (assessmentResultGroupId) {
          request.input('GroupId', sql.Int, assessmentResultGroupId);
        }

        await request.query(insertQuery);

        console.log(`[GUARDAR_ACUMULATIVA] Promedio insertado exitosamente: regId=${registrationId}, promedio=${promedioFinal}`);
        promediosInsertados++;

      } catch (insertAvgError) {
        console.error(`[ERROR] Error al insertar promedio en BD para registrationId ${registrationId}:`, insertAvgError);
        // Si falla la inserción del promedio, logueamos el error.
      }

    } // Fin del bucle for (const alumno of subnotas)

    // Si llegamos aquí sin errores no capturados, la transacción puede ser commiteada
    await transaction.commit();
    console.log(`[GUARDAR_ACUMULATIVA] Proceso finalizado exitosamente. Estadísticas: Notas insertadas: ${notasInsertadas}, Promedios insertados: ${promediosInsertados}, Registros omitidos: ${registrosOmitidos}, Registros de inscripción creados: ${registrosCreados}, Grupos creados: ${gruposCreados}`);

    res.status(200).json({
      success: true,
      message: 'Notas acumulativas guardadas correctamente',
      stats: {
        notasInsertadas,
        promediosInsertados,
        registrosOmitidos,
        registrosCreados,
        gruposCreados
      }
    });
  } catch (error) {
    // Si algo falla en cualquier punto después de begin(), se hace rollback
    await transaction.rollback();
    console.error('[GUARDAR_ACUMULATIVA][ERROR] Falló la transacción:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar notas acumulativas',
      error: error.message || error
    });
  }
};





// POST /api/notas/get-notas-acumuladas
exports.getNotasAcumuladas = async (req, res) => {
  try {
    const { cursoId, asignaturaId, assessmentIds } = req.body;

    if (!cursoId || !asignaturaId || !Array.isArray(assessmentIds) || assessmentIds.length === 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const pool = await poolPromise;
    const request = pool.request();

    console.log(`[GET_NOTAS_ACUMULADAS] cursoId=${cursoId}, asignaturaId=${asignaturaId}, columnas=${assessmentIds.join(',')}`);

    const query = `
      WITH Estudiantes AS (
        SELECT DISTINCT
          p.PersonId,
          p.FirstName,
          p.LastName,
          p.SecondLastName
        FROM OrganizationPersonRole r
        INNER JOIN Person p ON p.PersonId = r.PersonId
        WHERE r.OrganizationId = @cursoId
          AND r.RoleId = 6
      ),
      Registros AS (
        SELECT
          ar.AssessmentRegistrationId,
          ar.PersonId,
          ar.CourseSectionOrganizationId
        FROM AssessmentRegistration ar
        WHERE ar.CourseSectionOrganizationId = @asignaturaId
      ),
      Resultados AS (
        SELECT
          ar.PersonId,
          ar.AssessmentRegistrationId,
          r.AssessmentId,
          r.ScoreValue,
          r.IsAverage
        FROM AssessmentResult r
        INNER JOIN AssessmentRegistration ar ON ar.AssessmentRegistrationId = r.AssessmentRegistrationId
        WHERE r.AssessmentId IN (${assessmentIds.join(',')})
      )
      SELECT 
        e.PersonId,
        e.FirstName,
        e.LastName,
        e.SecondLastName,
        r.AssessmentId,
        r.ScoreValue,
        r.IsAverage
      FROM Estudiantes e
      INNER JOIN Registros ar ON ar.PersonId = e.PersonId
      LEFT JOIN Resultados r ON r.PersonId = e.PersonId AND r.AssessmentRegistrationId = ar.AssessmentRegistrationId
      ORDER BY e.LastName, e.FirstName, r.AssessmentId, r.IsAverage
    `;

    const result = await request
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId)
      .query(query);

    console.log(`[GET_NOTAS_ACUMULADAS] Resultados obtenidos: ${result.recordset.length}`);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('[GET_NOTAS_ACUMULADAS][ERROR]', error);
    res.status(500).json({ success: false, message: 'Error al obtener notas acumulativas', error });
  }
};


//aqui2
// POST /api/notas/crear-assessment-registrations
exports.crearAssessmentRegistrations = async (req, res) => {
  const { assessmentId, estudiantes } = req.body;

  if (!assessmentId || !Array.isArray(estudiantes)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const pool = await poolPromise;
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 🔍 Buscar el AssessmentAdministrationId correspondiente
    const requestAdmin = new sql.Request(tx);
    const resultAdmin = await requestAdmin
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);

    if (resultAdmin.recordset.length === 0) {
      throw new Error(`No se encontró AssessmentAdministration para el assessmentId ${assessmentId}`);
    }

    const assessmentAdministrationId = resultAdmin.recordset[0].AssessmentAdministrationId;

    for (const est of estudiantes) {
      if (!est.personId || !est.courseSectionOrgId || !est.assignedBy) {
        console.warn(`[WARN crearAssessmentRegistrations] Estudiante omitido por datos incompletos: ${JSON.stringify(est)}`);
        continue;
      }

      const requestCheck = new sql.Request(tx);
      const check = await requestCheck
        .input('personId', sql.Int, est.personId)
        .input('asignaturaId', sql.Int, est.courseSectionOrgId)
        .query(`
          SELECT AssessmentRegistrationId
          FROM AssessmentRegistration
          WHERE PersonId = @personId
            AND CourseSectionOrganizationId = @asignaturaId
        `);

      if (check.recordset.length === 0) {
        const requestInsert = new sql.Request(tx);
        await requestInsert
          .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('courseSectionOrgId', sql.Int, est.courseSectionOrgId)
          .input('personId', sql.Int, est.personId)
          .input('assignedBy', sql.Int, est.assignedBy)
          .input('anio', sql.Int, 1) // Puede ajustarse si se desea usar dinámicamente el año escolar
          .query(`
            INSERT INTO AssessmentRegistration (
              AssessmentAdministrationId,
              CourseSectionOrganizationId,
              PersonId,
              AssignedByPersonId,
              SchoolFullAcademicYear,
              CreationDate
            )
            VALUES (
              @assessmentAdministrationId,
              @courseSectionOrgId,
              @personId,
              @assignedBy,
              @anio,
              GETDATE()
            )
          `);
      }
    }

    await tx.commit();
    res.json({ message: 'Registros verificados/insertados correctamente' });

  } catch (error) {
    await tx.rollback();
    console.error('[ERROR crearAssessmentRegistrations]', error);
    res.status(500).json({ error: 'Error al registrar estudiantes en evaluación' });
  }
};




// DELETE /api/notas/limpiar-datos-previos
exports.limpiarDatosPrevios = async (req, res) => {
  try {
    const { assessmentId, cursoId, asignaturaId, columna } = req.body;

    if (!assessmentId || !cursoId || !asignaturaId || !columna) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log(`[LIMPIAR_DATOS] Iniciando limpieza para assessmentId: ${assessmentId}, columna: ${columna}`);

    try {
      // Ya no se usa AssessmentSubtest → usamos directamente el assessmentId como referencia
      const assessmentSubtestId = parseInt(assessmentId);

      // 1. Eliminar registros de AssessmentResult relacionados
      const deleteResultResult = await new sql.Request(transaction)
        .input('assessmentSubtestId', sql.Int, assessmentSubtestId)
        .input('cursoId', sql.Int, cursoId)
        .input('asignaturaId', sql.Int, asignaturaId)
        .query(`
          DELETE ar FROM AssessmentResult ar
          INNER JOIN AssessmentRegistration reg ON ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
          WHERE ar.AssessmentSubtestId = @assessmentSubtestId
            AND reg.OrganizationId = @cursoId
            AND reg.CourseSectionOrganizationId = @asignaturaId
        `);

      console.log(`[LIMPIAR_DATOS] Registros eliminados de AssessmentResult: ${deleteResultResult.rowsAffected[0]}`);

      // 2. Eliminar registros de AssessmentRegistration si no tienen otros resultados
      const deleteRegistrationResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .input('cursoId', sql.Int, cursoId)
        .input('asignaturaId', sql.Int, asignaturaId)
        .query(`
          DELETE reg FROM AssessmentRegistration reg
          WHERE reg.AssessmentFormId = 9999 -- dummy usado según definición actual
            AND reg.OrganizationId = @cursoId
            AND reg.CourseSectionOrganizationId = @asignaturaId
            AND NOT EXISTS (
              SELECT 1 FROM AssessmentResult ar 
              WHERE ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
            )
        `);

      console.log(`[LIMPIAR_DATOS] Registros eliminados de AssessmentRegistration: ${deleteRegistrationResult.rowsAffected[0]}`);

      await transaction.commit();

      res.status(200).json({
        message: 'Datos previos limpiados correctamente',
        resultadosEliminados: deleteResultResult.rowsAffected[0],
        registrosEliminados: deleteRegistrationResult.rowsAffected[0]
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('[LIMPIAR_DATOS][ERROR]', error);
    res.status(500).json({ error: 'Error al limpiar datos previos' });
  }
};


// POST /api/notas/notas-acumuladas/cargar-existentes
exports.cargarNotasAcumulativasExistentes = async (req, res) => {
  try {
    const { assessmentSubtestId, cursoId, asignaturaId } = req.body;

    if (!assessmentSubtestId || !cursoId || !asignaturaId) {
      return res.status(400).json({ error: 'Parámetros requeridos faltantes' });
    }

    const pool = await poolPromise;

    console.log(`[CARGAR_EXISTENTES] Buscando notas para assessmentSubtestId: ${assessmentSubtestId}`);

    const query = `
      SELECT 
        ar.AssessmentRegistrationId,
        p.FirstName,
        p.LastName,
        p.SecondLastName,
        result.ScoreValue,
        result.IsAverage,
        ROW_NUMBER() OVER (PARTITION BY ar.AssessmentRegistrationId, result.IsAverage ORDER BY result.DateCreated) as RowNum
      FROM AssessmentResult result
      INNER JOIN AssessmentRegistration ar ON result.AssessmentRegistrationId = ar.AssessmentRegistrationId
      INNER JOIN Person p ON ar.PersonId = p.PersonId
      WHERE result.AssessmentSubtestId = @assessmentSubtestId
        AND ar.OrganizationId = @cursoId
        AND ar.CourseSectionOrganizationId = @asignaturaId
      ORDER BY p.LastName, p.FirstName, result.IsAverage, result.DateCreated
    `;

    const result = await pool.request()
      .input('assessmentSubtestId', sql.Int, assessmentSubtestId)
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId)
      .query(query);

    // Organizar los datos por estudiante
    const estudiantesMap = {};

    for (const row of result.recordset) {
      const key = row.AssessmentRegistrationId;
      
      if (!estudiantesMap[key]) {
        estudiantesMap[key] = {
          AssessmentRegistrationId: row.AssessmentRegistrationId,
          FirstName: row.FirstName,
          LastName: row.LastName,
          SecondLastName: row.SecondLastName,
          subnotas: [],
          promedio: null
        };
      }

      if (row.IsAverage === 1) {
        estudiantesMap[key].promedio = row.ScoreValue;
      } else {
        estudiantesMap[key].subnotas.push(row.ScoreValue);
      }
    }

    const estudiantesConNotas = Object.values(estudiantesMap);
    
    console.log(`[CARGAR_EXISTENTES] Estudiantes encontrados: ${estudiantesConNotas.length}`);
    
    res.status(200).json(estudiantesConNotas);
  } catch (error) {
    console.error('[CARGAR_EXISTENTES][ERROR]', error);
    res.status(500).json({ error: 'Error al cargar notas existentes' });
  }
};

// Función faltante para obtener AssessmentAdministration
exports.getAssessmentAdministration = async (req, res) => {
  const { assessmentId } = req.params;
  
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 AssessmentAdministrationId
        FROM AssessmentAdministration
        WHERE AssessmentId = @assessmentId
      `);
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: 'AssessmentAdministration no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener AssessmentAdministration:', error);
    res.status(500).json({ error: 'Error al obtener AssessmentAdministration.' });
  }
};

// POST /api/notas/crear-subnotas
exports.crearSubnotas = async (req, res) => {
  try {
    const { assessmentId, cantidadSubnotas } = req.body;
    
    if (!assessmentId || !cantidadSubnotas) {
      return res.status(400).json({ error: 'Se requieren assessmentId y cantidadSubnotas' });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const subnotas = [];
      
      for (let i = 1; i <= cantidadSubnotas; i++) {
        const identifier = `SUB${i}`;
        const title = `Subnota ${i}`;
        
        const result = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .input('identifier', sql.NVarChar, identifier)
          .input('title', sql.NVarChar, title)
          .query(`
            INSERT INTO AssessmentSubtest (AssessmentId, Identifier, Title)
            OUTPUT INSERTED.AssessmentSubtestId, INSERTED.Identifier, INSERTED.Title
            VALUES (@assessmentId, @identifier, @title)
          `);
        
        if (result.recordset.length > 0) {
          subnotas.push(result.recordset[0]);
        }
      }
      
      await transaction.commit();
      
      res.status(200).json({
        message: 'Subnotas creadas exitosamente',
        subnotas
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('[CREAR_SUBNOTAS][ERROR]', error);
    res.status(500).json({ error: 'Error al crear subnotas' });
  }
};

// POST /api/notas/corregir-subtestid-nulos
exports.corregirSubtestIdNulos = async (req, res) => {
  try {
    const { assessmentId } = req.body;
    
    if (!assessmentId) {
      return res.status(400).json({ error: 'Se requiere assessmentId' });
    }
    
    const pool = await poolPromise;
    
    // Obtener los subtests disponibles para este assessment
    const subtestsResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentSubtestId, Identifier
        FROM AssessmentSubtest
        WHERE AssessmentId = @assessmentId
        ORDER BY Identifier
      `);
    
    const subtests = subtestsResult.recordset;
    
    if (subtests.length === 0) {
      return res.status(404).json({ error: 'No se encontraron subtests para este assessment' });
    }
    
    // Corregir los registros con AssessmentSubtestId nulo
    const updateResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        UPDATE ar
        SET ar.AssessmentSubtestId = 
          CASE 
            WHEN result.Identifier LIKE 'SUB%' THEN 
              TRY_CAST(SUBSTRING(result.Identifier, 4, LEN(result.Identifier)) AS INT)
            ELSE 1
          END
        FROM AssessmentResult ar
        JOIN AssessmentRegistration reg ON ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
        CROSS APPLY (SELECT TOP 1 Identifier FROM AssessmentSubtest WHERE AssessmentId = @assessmentId) as result
        WHERE ar.AssessmentId = @assessmentId
          AND ar.AssessmentSubtestId IS NULL
      `);
    
    res.status(200).json({
      message: 'Registros corregidos exitosamente',
      registrosActualizados: updateResult.rowsAffected[0]
    });
    
  } catch (error) {
    console.error('[CORREGIR_SUBTESTID_NULOS][ERROR]', error);
    res.status(500).json({ error: 'Error al corregir registros con subtestId nulo' });
  }
};

// POST /api/notas/actualizar-tipo-columna
exports.actualizarTipoColumna = async (req, res) => {
  try {
    const { assessmentId, tipoColumna } = req.body;

    if (!assessmentId || !tipoColumna) {
      return res.status(400).json({ error: 'Se requieren assessmentId y tipoColumna' });
    }
    
    console.log(`[ACTUALIZAR_TIPO_COLUMNA] Actualizando assessmentId ${assessmentId} a tipo ${tipoColumna}`);
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Actualizar el tipo de nota en la tabla Assessment
      await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .input('tipoColumna', sql.Int, tipoColumna)
        .query(`
          UPDATE Assessment 
          SET VisualNoteType = @tipoColumna
          WHERE AssessmentId = @assessmentId
        `);

      // Si estamos cambiando a tipo directo (1), eliminamos las notas existentes
      if (tipoColumna === 1 || tipoColumna === '1') {
        const deleteResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .query(`
            DELETE FROM AssessmentResult
            WHERE AssessmentRegistrationId IN (
              SELECT AssessmentRegistrationId 
              FROM AssessmentRegistration 
              WHERE AssessmentId = @assessmentId
            )
          `);
        
        console.log(`[ACTUALIZAR_TIPO_COLUMNA] Notas existentes borradas: ${deleteResult.rowsAffected[0]}`);
      }

      await transaction.commit();
      res.status(200).json({ 
        success: true, 
        message: `Tipo de columna actualizado correctamente a ${tipoColumna}` 
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[ACTUALIZAR_TIPO_COLUMNA][ERROR]', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar tipo de columna', 
      error: error.message 
    });
  }
};

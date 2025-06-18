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
          CONVERT(VARCHAR, A.AssessmentRevisionDate, 23) AS PublishedDate -- Formato YYYY-MM-DD directo desde SQL
        FROM Assessment A
        LEFT JOIN RefAssessmentType RAT ON A.RefAssessmentTypeId = RAT.RefAssessmentTypeId
        WHERE A.AssessmentId = @assessmentId
      `);

    if (result.recordset.length === 0) {
      console.log(`[OBTENER_CONFIG] No se encontró configuración para assessmentId: ${assessmentId}`);
      return res.status(404).json({ error: 'No se encontró configuración para la columna indicada.' });
    }

    const configuracion = result.recordset[0];
    
    // La fecha ya viene formateada directamente desde SQL como YYYY-MM-DD
    console.log(`[OBTENER_CONFIG] Fecha de SQL (ya formateada): ${configuracion.PublishedDate}`);
    
    console.log(`[OBTENER_CONFIG] Configuración encontrada:`, configuracion);

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


/*
// POST /api/notas/notas-acumuladas
exports.guardarNotasAcumuladas = async (req, res) => {
  try {
    const { assessmentSubtestId, fecha, subnotas } = req.body;

    if (!assessmentSubtestId || !fecha || !Array.isArray(subnotas)) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log(`[GUARDAR_ACUMULATIVA] Iniciando proceso para assessmentSubtestId: ${assessmentSubtestId}`);
    console.log(`[GUARDAR_ACUMULATIVA] Fecha de evaluación: ${fecha}`);
    console.log(`[GUARDAR_ACUMULATIVA] Total subnotas recibidas: ${subnotas.length}`);

    for (const alumno of subnotas) {
      const registrationId = alumno.assessmentRegistrationId;

      // Validar ID
      if (!registrationId || isNaN(registrationId)) {
        console.warn(`[GUARDAR_ACUMULATIVA] Registro omitido por ID inválido:`, registrationId);
        continue;
      }

      // Crear nuevo request para cada operación para evitar conflictos de parámetros
      let request = new sql.Request(transaction);

      // Eliminar notas anteriores del subtest
      await request
        .input('AssessmentRegistrationId', sql.Int, registrationId)
        .input('AssessmentSubtestId', sql.Int, assessmentSubtestId)
        .query(`
          DELETE FROM AssessmentResult
          WHERE AssessmentRegistrationId = @AssessmentRegistrationId
            AND AssessmentSubtestId = @AssessmentSubtestId
        `);

      // Insertar subnotas (IsAverage = 0)
      if (Array.isArray(alumno.notas)) {
        for (let i = 0; i < alumno.notas.length; i++) {
          const nota = alumno.notas[i];

          if (nota !== null && nota !== undefined && !isNaN(nota)) {
            const notaRedondeada = Math.round(nota * 10) / 10;

            // Crear nuevo request para cada subnota
            request = new sql.Request(transaction);
            await request
              .input('RegId', sql.Int, registrationId)
              .input('SubtestId', sql.Int, assessmentSubtestId)
              .input('Nota', sql.Decimal(4, 1), notaRedondeada)
              .input('Fecha', sql.DateTime, fecha)
              .query(`
                INSERT INTO AssessmentResult
                (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated)
                VALUES (@RegId, @SubtestId, @Nota, 0, @Fecha)
              `);

            console.log(`[GUARDAR_ACUMULATIVA] Subnota insertada para ${registrationId} - nota[${i}]: ${notaRedondeada}`);
          } else {
            console.warn(`[GUARDAR_ACUMULATIVA] Nota inválida omitida en alumno ${registrationId}, índice ${i}:`, nota);
          }
        }
      }

      // Insertar promedio (IsAverage = 1)
      if (alumno.promedio !== null && alumno.promedio !== undefined && !isNaN(alumno.promedio)) {
        const promedioRedondeado = Math.round(alumno.promedio * 10) / 10;

        // Crear nuevo request para el promedio
        request = new sql.Request(transaction);
        await request
          .input('RegId', sql.Int, registrationId)
          .input('SubtestId', sql.Int, assessmentSubtestId)
          .input('Promedio', sql.Decimal(4, 1), promedioRedondeado)
          .input('Fecha', sql.DateTime, fecha)
          .query(`
            INSERT INTO AssessmentResult
            (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage, DateCreated)
            VALUES (@RegId, @SubtestId, @Promedio, 1, @Fecha)
          `);

        console.log(`[GUARDAR_ACUMULATIVA] Promedio insertado para ${registrationId}: ${promedioRedondeado}`);
      } else {
        console.warn(`[GUARDAR_ACUMULATIVA] Promedio inválido omitido para alumno ${registrationId}`);
      }
    }

    await transaction.commit();
    console.log('[GUARDAR_ACUMULATIVA] Proceso finalizado exitosamente');
    res.status(200).json({ success: true, message: 'Notas acumulativas guardadas correctamente' });
  } catch (error) {
    console.error('[GUARDAR_ACUMULATIVA][ERROR]', error);
    res.status(500).json({ success: false, message: 'Error al guardar notas acumulativas', error });
  }
};

*/

// POST /api/notas/notas-acumuladas/guardar
exports.guardarNotasAcumuladas = async (req, res) => {
  try {
    console.log('[GUARDAR_ACUMULATIVA] Iniciando con datos:', JSON.stringify(req.body));
    const { assessmentId, subnotas, fecha, cursoId, asignaturaId } = req.body;

    if (!assessmentId || !Array.isArray(subnotas)) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 1. Obtener AssessmentSubtestIds para este assessmentId
      const subtestResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT ast.AssessmentSubtestId, ast.Identifier
          FROM AssessmentSubtest ast
          INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
          WHERE af.AssessmentId = @assessmentId
          ORDER BY ast.AssessmentSubtestId
        `);
        
      const subtestIds = subtestResult.recordset.map(r => r.AssessmentSubtestId);
      console.log(`[GUARDAR_ACUMULATIVA] AssessmentSubtestIds encontrados:`, subtestIds);
      
      if (subtestIds.length === 0) {
        console.error(`[GUARDAR_ACUMULATIVA] No se encontraron AssessmentSubtestIds para assessmentId: ${assessmentId}`);
        await transaction.rollback();
        return res.status(404).json({ error: 'No se encontraron AssessmentSubtestIds' });
      }
      
      let notasInsertadas = 0;
      let promediosInsertados = 0;
      
      // 2. Procesar cada alumno
      for (const alumno of subnotas) {
        const registrationId = alumno.assessmentRegistrationId;
        
        if (!registrationId || isNaN(registrationId)) {
          console.warn(`[GUARDAR_ACUMULATIVA] Registro omitido por ID inválido:`, registrationId);
          continue;
        }
        
        console.log(`[GUARDAR_ACUMULATIVA] Procesando alumno con registrationId: ${registrationId}`);
        
        // 3. Eliminar notas existentes para este registro y estos subtests
        await new sql.Request(transaction)
          .input('registrationId', sql.Int, registrationId)
          .query(`
            DELETE FROM AssessmentResult 
            WHERE AssessmentRegistrationId = @registrationId
            AND AssessmentSubtestId IN (${subtestIds.join(',')})
          `);
          
        console.log(`[GUARDAR_ACUMULATIVA] Eliminadas notas existentes para registrationId: ${registrationId}`);
        
        // 4. Insertar subnotas
        if (Array.isArray(alumno.notas)) {
          let notasValidas = 0;
          let sumaNotas = 0;
          
          for (let i = 0; i < Math.min(alumno.notas.length, subtestIds.length); i++) {
            const nota = alumno.notas[i];
            const subtestId = subtestIds[i];
            
            if (nota !== null && nota !== undefined && !isNaN(parseFloat(nota))) {
              const notaRedondeada = Math.round(parseFloat(nota) * 10) / 10;
              
              try {
                await new sql.Request(transaction)
                  .input('regId', sql.Int, registrationId)
                  .input('subtestId', sql.Int, subtestId)
                  .input('nota', sql.Decimal(4, 1), notaRedondeada)
                  .query(`
                    INSERT INTO AssessmentResult
                    (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage)
                    VALUES (@regId, @subtestId, @nota, 0)
                  `);
                  
                console.log(`[GUARDAR_ACUMULATIVA] Subnota insertada: regId=${registrationId}, subtestId=${subtestId}, nota=${notaRedondeada}`);
                notasInsertadas++;
                notasValidas++;
                sumaNotas += notaRedondeada;
              } catch (error) {
                console.error(`[GUARDAR_ACUMULATIVA] Error al insertar subnota:`, error);
              }
            }
          }
          
          // 5. Calcular e insertar promedio
          if (notasValidas > 0) {
            const promedio = Math.round((sumaNotas / notasValidas) * 10) / 10;
            const subtestId = subtestIds[0]; // Usar el primer subtestId para el promedio

            try {
              // Insertar promedio
              await new sql.Request(transaction)
                .input('regId', sql.Int, registrationId)
                .input('subtestId', sql.Int, subtestId)
                .input('promedio', sql.Decimal(4, 1), promedio)
                .query(`
                  INSERT INTO AssessmentResult                  (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage)
                  VALUES (@regId, NULL, @promedio, 1)                  `);

              console.log(`[GUARDAR_ACUMULATIVA] Promedio insertado: regId=${registrationId}, subtestId=${subtestId}, promedio=${promedio}`);
              promediosInsertados++;



              console.log(`[GUARDAR_ACUMULATIVA] Nota principal insertada: regId=${registrationId}, subtestId=${subtestId}, promedio=${promedio}`);
            } catch (error) {
              console.error(`[GUARDAR_ACUMULATIVA] Error al insertar promedio/nota principal:`, error);
            }
          }
        }
      }
      
      await transaction.commit();
      console.log(`[GUARDAR_ACUMULATIVA] Proceso finalizado exitosamente. Notas insertadas: ${notasInsertadas}, Promedios insertados: ${promediosInsertados}`);
      
      res.status(200).json({
        success: true,
        message: 'Notas acumulativas guardadas correctamente',
        stats: {
          notasInsertadas,
          promediosInsertados
        }
      });
    } catch (error) {
      await transaction.rollback();
      console.error('[GUARDAR_ACUMULATIVA][ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Error al guardar notas acumulativas',
        error: error.message || error
      });
    }
  } catch (error) {
    console.error('[GUARDAR_ACUMULATIVA][ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar notas acumulativas',
      error: error.message || error
    });
  }
};


/*
// GET /api/notas/notas-acumuladas
exports.getNotasAcumuladas = async (req, res) => {
  try {
    const { cursoId, asignaturaId, columnas } = req.body;

    if (!cursoId || !asignaturaId || !Array.isArray(columnas) || columnas.length === 0) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const pool = await poolPromise;
    const request = pool.request();

    // Convertir columnas a enteros si vienen como strings tipo 'N1', 'N2'
    // CORREGIDO: Buscar AssessmentSubtestId real en lugar de números de columna
    let assessmentSubtestIds = [];
    
    for (const col of columnas) {
      if (!isNaN(col)) {
        // Si viene como número, verificar si es AssessmentId o AssessmentSubtestId
        const colNum = parseInt(col);
        
        // Si es mayor que 100, probablemente es un AssessmentId, buscar su AssessmentSubtestId
        if (colNum > 100) {
          const request2 = pool.request();
          const subtestResult = await request2
            .input('assessmentId', sql.Int, colNum)
            .query(`
              SELECT ast.AssessmentSubtestId 
              FROM AssessmentSubtest ast
              INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
              WHERE af.AssessmentId = @assessmentId
            `);
          
          if (subtestResult.recordset.length > 0) {
            assessmentSubtestIds.push(subtestResult.recordset[0].AssessmentSubtestId);
          }
        } else {
          // Si es menor, asumimos que es un AssessmentSubtestId directo
          assessmentSubtestIds.push(colNum);
        }
      } else {
        // Si viene como 'N1', 'N2', buscar el AssessmentSubtestId correspondiente
        const request2 = pool.request();
        const subtestResult = await request2
          .input('identifier', sql.NVarChar, col)
          .query(`
            SELECT ast.AssessmentSubtestId 
            FROM AssessmentSubtest ast
            INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
            WHERE ast.Identifier = @identifier
          `);
        
        if (subtestResult.recordset.length > 0) {
          assessmentSubtestIds.push(subtestResult.recordset[0].AssessmentSubtestId);
        }
      }
    }

    if (assessmentSubtestIds.length === 0) {
      return res.status(400).json({ error: 'No se encontraron AssessmentSubtestIds válidos' });
    }
	
	console.log(`[GET_NOTAS_ACUMULADAS] Consultando con cursoId=${cursoId}, asignaturaId=${asignaturaId}, columnas=${assessmentSubtestIds}`);

    // NUEVA CONSULTA SIMPLIFICADA para evitar duplicados
    const query = `
      WITH EstudiantesUnicos AS (
        SELECT DISTINCT
          p.PersonId,
          p.FirstName,
          p.LastName,
          p.SecondLastName,
          r.OrganizationPersonRoleId
        FROM OrganizationPersonRole r
        INNER JOIN Person p ON p.PersonId = r.PersonId
        WHERE r.OrganizationId = @cursoId
          AND r.RoleId = 6
      ),
      RegistrosValidos AS (
        SELECT DISTINCT
          ar.AssessmentRegistrationId,
          ar.PersonId
        FROM AssessmentRegistration ar
        INNER JOIN AssessmentForm af ON ar.AssessmentFormId = af.AssessmentFormId
        INNER JOIN AssessmentSubtest ast ON af.AssessmentFormId = ast.AssessmentFormId
        WHERE ar.CourseSectionOrganizationId = @asignaturaId
          AND ar.OrganizationId = @cursoId
          AND ast.AssessmentSubtestId IN (${assessmentSubtestIds.join(',')})
      )
      SELECT 
        eu.FirstName,
        eu.LastName,
        eu.SecondLastName,
        eu.PersonId,
        eu.OrganizationPersonRoleId,
        rv.AssessmentRegistrationId
      FROM EstudiantesUnicos eu
      INNER JOIN RegistrosValidos rv ON eu.PersonId = rv.PersonId
      ORDER BY eu.LastName, eu.FirstName
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

*/

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
    const { assessmentId, cursoId, asignaturaId } = req.body;

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

// POST /api/notas/crear-subnotas
exports.crearSubnotas = async (req, res) => {
  try {
    const { assessmentId, columna, cantidadSubnotas } = req.body;
    
    if (!assessmentId || !columna) {
      return res.status(400).json({ error: 'Faltan datos requeridos (assessmentId, columna)' });
    }
    
    const cantidad = cantidadSubnotas || 2; // Por defecto, crear 2 subnotas
    const pool = await poolPromise;
    
    console.log(`[CREAR_SUBNOTAS] Iniciando creación para assessmentId=${assessmentId}, columna=${columna}, cantidad=${cantidad}`);
    
    // Verificar si ya existe un AssessmentForm para este Assessment
    const formResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentFormId 
        FROM AssessmentForm 
        WHERE AssessmentId = @assessmentId
      `);
    
    let assessmentFormId;
    
    if (formResult.recordset.length > 0) {
      assessmentFormId = formResult.recordset[0].AssessmentFormId;
      console.log(`[CREAR_SUBNOTAS] AssessmentForm existente encontrado: ${assessmentFormId}`);
    } else {
      // Crear un nuevo AssessmentForm
      // Verificar la estructura de la tabla AssessmentForm
      const checkTableResult = await pool.request()
        .query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = 'AssessmentForm'
        `);
      
      const columns = checkTableResult.recordset.map(col => col.COLUMN_NAME);
      console.log(`[CREAR_SUBNOTAS] Columnas disponibles en AssessmentForm:`, columns);
      
      // Construir la consulta dinámicamente según las columnas disponibles
      let insertQuery = `INSERT INTO AssessmentForm (AssessmentId`;
      let valuesQuery = `VALUES (@assessmentId`;
      
      if (columns.includes('FormVersion')) {
        insertQuery += `, FormVersion`;
        valuesQuery += `, 1`;
      }
      
      if (columns.includes('Title')) {
        insertQuery += `, Title`;
        valuesQuery += `, @title`;
      }
      
      insertQuery += `) ${valuesQuery}); SELECT SCOPE_IDENTITY() AS AssessmentFormId;`;
      
      const insertFormResult = await pool.request()
        .input('assessmentId', sql.Int, assessmentId)
        .input('title', sql.NVarChar(100), `Formulario para ${columna}`)
        .query(insertQuery);
      
      assessmentFormId = insertFormResult.recordset[0].AssessmentFormId;
      console.log(`[CREAR_SUBNOTAS] Nuevo AssessmentForm creado: ${assessmentFormId}`);
    }
    
    // Verificar si ya existen AssessmentSubtests para este AssessmentForm
    const subtestResult = await pool.request()
      .input('assessmentFormId', sql.Int, assessmentFormId)
      .query(`
        SELECT AssessmentSubtestId, Identifier
        FROM AssessmentSubtest
        WHERE AssessmentFormId = @assessmentFormId
      `);
    
    if (subtestResult.recordset.length > 0) {
      console.log(`[CREAR_SUBNOTAS] Ya existen ${subtestResult.recordset.length} subtests para este formulario`);
      return res.status(200).json({ 
        message: 'Ya existen subtests para este assessment', 
        subtests: subtestResult.recordset 
      });
    }
    
        // Verificar la estructura de la tabla AssessmentSubtest una vez fuera del bucle
    const checkSubtestTableResult = await pool.request()
      .query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'AssessmentSubtest'
      `);
    
    const subtestColumns = checkSubtestTableResult.recordset.map(col => col.COLUMN_NAME);
    console.log(`[CREAR_SUBNOTAS] Columnas disponibles en AssessmentSubtest:`, subtestColumns);
    
    // Crear los nuevos AssessmentSubtests
    const subtests = [];
    
    for (let i = 1; i <= cantidad; i++) {
      const identifier = `${columna}_${i}`;
      
      // Construir la consulta dinámicamente según las columnas disponibles
      let insertSubtestQuery = `INSERT INTO AssessmentSubtest (AssessmentFormId, Identifier`;
      let valuesSubtestQuery = `VALUES (@assessmentFormId, @identifier`;
      
      if (subtestColumns.includes('Title')) {
        insertSubtestQuery += `, Title`;
        valuesSubtestQuery += `, @title`;
      }
      
      if (subtestColumns.includes('MinScore')) {
        insertSubtestQuery += `, MinScore`;
        valuesSubtestQuery += `, 1.0`;
      }
      
      if (subtestColumns.includes('MaxScore')) {
        insertSubtestQuery += `, MaxScore`;
        valuesSubtestQuery += `, 7.0`;
      }
      
      insertSubtestQuery += `) ${valuesSubtestQuery}); SELECT SCOPE_IDENTITY() AS AssessmentSubtestId;`;
      
      const insertSubtestResult = await pool.request()
        .input('assessmentFormId', sql.Int, assessmentFormId)
        .input('identifier', sql.NVarChar(60), identifier)
        .input('title', sql.NVarChar(100), `Subnota ${i} para ${columna}`)
        .query(insertSubtestQuery);
      
      const assessmentSubtestId = insertSubtestResult.recordset[0].AssessmentSubtestId;
      subtests.push({ assessmentSubtestId, identifier });
      
      console.log(`[CREAR_SUBNOTAS] Subtest creado: ${assessmentSubtestId} (${identifier})`);
    }
    
    console.log(`[CREAR_SUBNOTAS] Se crearon ${subtests.length} subtests exitosamente`);
    
    res.status(201).json({
      success: true,
      message: `Se crearon ${subtests.length} subtests exitosamente`,
      assessmentFormId,
      subtests
    });
    
  } catch (error) {
    console.error('[CREAR_SUBNOTAS][ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear subtests',
      error: error.message || error
    });
  }
};

// GET /api/notas/assessment-administration/:assessmentId
exports.getAssessmentAdministration = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    if (!assessmentId) {
      return res.status(400).json({ error: 'Se requiere assessmentId' });
    }
    
    const pool = await poolPromise;
    
    // Verificar si ya existe un AssessmentAdministration para este Assessment
    const adminResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentAdministrationId 
        FROM AssessmentAdministration 
        WHERE AssessmentId = @assessmentId
      `);
    
    if (adminResult.recordset.length > 0) {
      const assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
      console.log(`[GET_ASSESSMENT_ADMIN] AssessmentAdministration existente: ${assessmentAdministrationId}`);
      
      return res.status(200).json({ assessmentAdministrationId });
    }
    
    // Crear un nuevo AssessmentAdministration
    const insertAdminResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .input('startDate', sql.DateTime, new Date())
      .query(`
        INSERT INTO AssessmentAdministration (
          AssessmentId, 
          AdministrationDate,
          StartDate
        )
        VALUES (
          @assessmentId, 
          GETDATE(),
          @startDate
        );
        
        SELECT SCOPE_IDENTITY() AS AssessmentAdministrationId;
      `);
    
    const assessmentAdministrationId = insertAdminResult.recordset[0].AssessmentAdministrationId;
    console.log(`[GET_ASSESSMENT_ADMIN] Nuevo AssessmentAdministration creado: ${assessmentAdministrationId}`);
    
    res.status(201).json({ assessmentAdministrationId });
    
  } catch (error) {
    console.error('[GET_ASSESSMENT_ADMIN][ERROR]', error);
    res.status(500).json({
      error: 'Error al obtener/crear AssessmentAdministration',
      details: error.message || error
    });
  }
};

// POST /api/notas/crear-registro
exports.crearRegistro = async (req, res) => {
  try {
    const { assessmentAdministrationId, organizationPersonRoleId, cursoId, asignaturaId } = req.body;
    
    if (!assessmentAdministrationId || !organizationPersonRoleId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const pool = await poolPromise;
    
    // Verificar si ya existe un registro para este estudiante y esta administración
    const existingResult = await pool.request()
      .input('adminId', sql.Int, assessmentAdministrationId)
      .input('oprId', sql.Int, organizationPersonRoleId)
      .query(`
        SELECT AssessmentRegistrationId 
        FROM AssessmentRegistration 
        WHERE AssessmentAdministrationId = @adminId
          AND OrganizationPersonRoleId = @oprId
      `);
    
    if (existingResult.recordset.length > 0) {
      const assessmentRegistrationId = existingResult.recordset[0].AssessmentRegistrationId;
      console.log(`[CREAR_REGISTRO] Registro existente encontrado: ${assessmentRegistrationId}`);
      
      return res.status(200).json({ 
        assessmentRegistrationId,
        message: 'Registro existente encontrado'
      });
    }
    
    // Crear un nuevo registro
    const insertResult = await pool.request()
      .input('adminId', sql.Int, assessmentAdministrationId)
      .input('oprId', sql.Int, organizationPersonRoleId)
      .query(`
        INSERT INTO AssessmentRegistration (
          AssessmentAdministrationId,
          OrganizationPersonRoleId,
          RecordStartDateTime
        )
        VALUES (
          @adminId,
          @oprId,
          GETDATE()
        );
        
        SELECT SCOPE_IDENTITY() AS AssessmentRegistrationId;
      `);
    
    const assessmentRegistrationId = insertResult.recordset[0].AssessmentRegistrationId;
    console.log(`[CREAR_REGISTRO] Nuevo registro creado: ${assessmentRegistrationId}`);
    
    res.status(201).json({ 
      assessmentRegistrationId,
      message: 'Nuevo registro creado exitosamente'
    });
    
  } catch (error) {
    console.error('[CREAR_REGISTRO][ERROR]', error);
    res.status(500).json({
      error: 'Error al crear registro de inscripción',
      details: error.message || error
    });
  }
};

// POST /api/notas/obtener-assessment-registrations
exports.obtenerAssessmentRegistrations = async (req, res) => {
  try {
    const { assessmentId, cursoId, asignaturaId } = req.body;
    
    if (!assessmentId || !cursoId || !asignaturaId) {
      return res.status(400).json({ error: 'Faltan datos requeridos (assessmentId, cursoId, asignaturaId)' });
    }
    
    const pool = await poolPromise;
    
    console.log(`[OBTENER_REGISTRATIONS] Buscando registros para assessmentId=${assessmentId}, cursoId=${cursoId}, asignaturaId=${asignaturaId}`);
    
    // Primero obtenemos el AssessmentAdministrationId correspondiente
    const adminResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT AssessmentAdministrationId 
        FROM AssessmentAdministration 
        WHERE AssessmentId = @assessmentId
      `);
    
    if (adminResult.recordset.length === 0) {
      console.log(`[OBTENER_REGISTRATIONS] No se encontró AssessmentAdministration para assessmentId=${assessmentId}`);
      return res.status(200).json([]);
    }
    
    const assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
    
    // Ahora buscamos los AssessmentRegistration
    const result = await pool.request()
      .input('adminId', sql.Int, assessmentAdministrationId)
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId)
      .query(`
        SELECT 
          ar.AssessmentRegistrationId,
          ar.PersonId,
          ar.OrganizationPersonRoleId,
          p.FirstName,
          p.LastName,
          p.SecondLastName
        FROM AssessmentRegistration ar
        INNER JOIN Person p ON ar.PersonId = p.PersonId
        WHERE ar.AssessmentAdministrationId = @adminId
          AND ar.OrganizationId = @cursoId
          AND ar.CourseSectionOrganizationId = @asignaturaId
        ORDER BY p.LastName, p.FirstName
      `);
    
    console.log(`[OBTENER_REGISTRATIONS] Se encontraron ${result.recordset.length} registros`);
    
    res.status(200).json(result.recordset);
    
  } catch (error) {
    console.error('[OBTENER_REGISTRATIONS][ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros de inscripción',
      error: error.message || error
    });
  }
};

// DELETE /api/notas/limpiar-datos-previos
exports.limpiarDatosPrevios = async (req, res) => {
  try {
    const { assessmentId } = req.query;
    
    if (!assessmentId) {
      return res.status(400).json({ error: 'Se requiere assessmentId' });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
      await transaction.begin();
      
      // 1. Identificar AssessmentForm asociado
      const formResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT AssessmentFormId 
          FROM AssessmentForm 
          WHERE AssessmentId = @assessmentId
        `);
      
      if (formResult.recordset.length === 0) {
        console.log(`[LIMPIAR_DATOS] No hay AssessmentForm para assessmentId=${assessmentId}`);
        await transaction.commit();
        return res.status(200).json({ message: 'No hay datos que limpiar' });
      }
      
      const assessmentFormId = formResult.recordset[0].AssessmentFormId;
      
      // 2. Identificar AssessmentSubtests asociados
      const subtestResult = await new sql.Request(transaction)
        .input('formId', sql.Int, assessmentFormId)
        .query(`
          SELECT AssessmentSubtestId 
          FROM AssessmentSubtest 
          WHERE AssessmentFormId = @formId
        `);
      
      if (subtestResult.recordset.length > 0) {
        const subtestIds = subtestResult.recordset.map(r => r.AssessmentSubtestId);
        
        // 3. Eliminar AssessmentResults asociados a estos subtests
        await new sql.Request(transaction)
          .query(`
            DELETE FROM AssessmentResult 
            WHERE AssessmentSubtestId IN (${subtestIds.join(',')})
          `);
        
        console.log(`[LIMPIAR_DATOS] Eliminados AssessmentResults para subtests: ${subtestIds.join(',')}`);
        
        // 4. Eliminar los AssessmentSubtests
        await new sql.Request(transaction)
          .input('formId', sql.Int, assessmentFormId)
          .query(`
            DELETE FROM AssessmentSubtest 
            WHERE AssessmentFormId = @formId
          `);
        
        console.log(`[LIMPIAR_DATOS] Eliminados ${subtestResult.recordset.length} AssessmentSubtests`);
      }
      
      // 5. Eliminar el AssessmentForm
      await new sql.Request(transaction)
        .input('formId', sql.Int, assessmentFormId)
        .query(`
          DELETE FROM AssessmentForm 
          WHERE AssessmentFormId = @formId
        `);
      
      console.log(`[LIMPIAR_DATOS] Eliminado AssessmentForm: ${assessmentFormId}`);
      
      await transaction.commit();
      
      res.status(200).json({
        success: true,
        message: 'Datos previos eliminados correctamente'
      });
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('[LIMPIAR_DATOS][ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar datos previos',
      error: error.message || error
    });
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
    
    // 1. Verificar si hay resultados con AssessmentId pero sin AssessmentSubtestId
    const resultadosNulos = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT COUNT(*) AS Total
        FROM AssessmentResult
        WHERE AssessmentId = @assessmentId
        AND (AssessmentSubtestId IS NULL OR AssessmentSubtestId = 0)
      `);
    
    const totalNulos = resultadosNulos.recordset[0].Total;
    
    if (totalNulos === 0) {
      return res.status(200).json({
        message: 'No se encontraron resultados con AssessmentSubtestId nulo',
        corregidos: 0
      });
    }
    
    // 2. Obtener el AssessmentSubtestId correspondiente
    const subtestResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 ast.AssessmentSubtestId
        FROM AssessmentSubtest ast
        INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
        WHERE af.AssessmentId = @assessmentId
        ORDER BY ast.AssessmentSubtestId
      `);
    
    if (subtestResult.recordset.length === 0) {
      // No hay subtests, necesitamos crear uno
      return res.status(400).json({
        error: 'No se encontraron AssessmentSubtests para este Assessment',
        message: 'Primero debe crear subtests usando la ruta /crear-subnotas'
      });
    }
    
    const assessmentSubtestId = subtestResult.recordset[0].AssessmentSubtestId;
    
    // 3. Actualizar los resultados
    const updateResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .input('subtestId', sql.Int, assessmentSubtestId)
      .query(`
        UPDATE AssessmentResult
        SET AssessmentSubtestId = @subtestId
        WHERE AssessmentId = @assessmentId
        AND (AssessmentSubtestId IS NULL OR AssessmentSubtestId = 0)
      `);
    
    console.log(`[CORREGIR_NULOS] Actualizados ${totalNulos} resultados con AssessmentSubtestId=${assessmentSubtestId}`);
    
    res.status(200).json({
      success: true,
      message: `Se corrigieron ${totalNulos} resultados con AssessmentSubtestId nulo`,
      corregidos: totalNulos,
      assessmentSubtestId
    });
    
  } catch (error) {
    console.error('[CORREGIR_NULOS][ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Error al corregir AssessmentSubtestId nulos',
      error: error.message || error
    });
  }
};

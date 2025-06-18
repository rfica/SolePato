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
    if (!actualAssessmentId && identifier) {
      console.log(`[BACKEND] Buscando assessmentId para identifier: ${identifier}`);
      const findResult = await pool.request()
        .input('identifier', sql.NVarChar, identifier)
        .query(`
          SELECT TOP 1 AssessmentId
          FROM Assessment
          WHERE Identifier = @identifier
          ORDER BY AssessmentId DESC
        `);

      if (findResult.recordset.length > 0) {
        actualAssessmentId = findResult.recordset[0].AssessmentId;
        console.log(`[BACKEND] AssessmentId encontrado: ${actualAssessmentId}`);
      } else {
        console.log(`[BACKEND] No se encontró AssessmentId para identifier: ${identifier}`);
        return res.status(404).json({ error: `No se encontró assessment para el identificador ${identifier}.` });
      }
    }

    if (!actualAssessmentId || !escalaId || !tipoNotaId) {
      console.log("[BACKEND] Faltan campos requeridos:", { assessmentId: actualAssessmentId, escalaId, tipoNotaId });
      return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    const result = await pool.request()
      .input('assessmentId', sql.Int, actualAssessmentId)
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
          .input('RegistroId', sql.Int, actualAssessmentId)
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
      .input('assessmentId', sql.Int, actualAssessmentId)
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
      .input('assessmentId', sql.Int, actualAssessmentId)
      .query(`DELETE FROM AssessmentObjective WHERE AssessmentId = @assessmentId`);

    if (objetivos && objetivos.length > 0) {
      for (const oaId of objetivos) {
        await pool.request()
          .input('assessmentId', sql.Int, actualAssessmentId)
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
          A.Objective AS Description,
          A.RefAssessmentTypeId,
          A.RefAssessmentPurposeId,
          RAT.Description AS AssessmentTypeDescription,
          RAST.Description AS AssessmentSubtestTypeDescription,
          RSMT.Description AS ScoreMetricTypeDescription,
          A.RefAssessmentSubtestTypeId,
          A.RefScoreMetricTypeId,
          A.WeightPercent,
          A.VisualNoteType,
          A.Tier,
          CONVERT(varchar, A.AssessmentRevisionDate, 23) AS PublishedDate
        FROM Assessment A
        LEFT JOIN RefAssessmentType RAT ON A.RefAssessmentTypeId = RAT.RefAssessmentTypeId
        LEFT JOIN RefAssessmentSubtestType RAST ON A.RefAssessmentSubtestTypeId = RAST.RefAssessmentSubtestTypeId
        LEFT JOIN RefScoreMetricType RSMT ON A.RefScoreMetricTypeId = RSMT.RefScoreMetricTypeId
        WHERE A.AssessmentId = @assessmentId
      `);

    // === AGREGAR ESTE LOG PARA DEPURACIÓN ===
    console.log(`[DEBUG BACKEND] Resultado crudo de la consulta para AssessmentId ${assessmentId}:`, result.recordset);
    // =======================================

    if (result.recordset.length === 0) {
      console.log(`[OBTENER_CONFIG] No se encontró configuración para assessmentId: ${assessmentId}`);
      return res.status(404).json({ error: 'No se encontró configuración para la columna indicada.' });
    }

    const configuracion = result.recordset[0];
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
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  let notasInsertadas = 0;
  let promediosInsertados = 0;
  let registrosOmitidos = 0;
  let notasPrincipalesActualizadas = 0;
  let registrosCreados = 0;

  try {
    const { assessmentId, subnotas, fecha, cursoId, asignaturaId } = req.body;

    console.log('[DEBUG] Recibida petición guardarNotasAcumuladas:', {
      assessmentId,
      fecha,
      cursoId,
      asignaturaId,
      subnotas: Array.isArray(subnotas) ? subnotas.length : 'no es array'
    });

    if (!assessmentId || !Array.isArray(subnotas) || !cursoId || !asignaturaId) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    await transaction.begin();

    // Obtener el AssessmentAdministrationId relacionado con este assessmentId
    const adminResult = await new sql.Request(transaction)
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);

    let assessmentAdministrationId;

    if (adminResult.recordset.length === 0) {
      // Si no existe AssessmentAdministration, crearlo
      console.log(`[GUARDAR_ACUMULATIVA] No se encontró AssessmentAdministrationId, creando uno nuevo`);
      
      const insertAdminResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
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
        await transaction.rollback();
        return res.status(500).json({ error: 'No se pudo crear AssessmentAdministration' });
      }
    } else {
      assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
    }
    
    console.log(`[GUARDAR_ACUMULATIVA] AssessmentAdministrationId: ${assessmentAdministrationId}`);

    // Obtener todos los AssessmentSubtestId relacionados con este assessmentId
    const subtestResult = await new sql.Request(transaction)
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT ast.AssessmentSubtestId, ast.Identifier
        FROM AssessmentSubtest ast
        INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
        WHERE af.AssessmentId = @assessmentId
        ORDER BY ast.AssessmentSubtestId
      `);
        
    let subtestIds = subtestResult.recordset.map(r => r.AssessmentSubtestId);
    console.log(`[DEBUG] AssessmentSubtestIds disponibles:`, subtestIds);
    console.log(`[DEBUG] Detalles de subtests:`, JSON.stringify(subtestResult.recordset));
    
    let assessmentFormId;
    
    if (subtestIds.length === 0) {
      // Si no hay subtests, primero verificar si existe AssessmentForm
      const formResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 AssessmentFormId
          FROM AssessmentForm
          WHERE AssessmentId = @assessmentId
        `);
        
      if (formResult.recordset.length > 0) {
        assessmentFormId = formResult.recordset[0].AssessmentFormId;
        console.log(`[GUARDAR_ACUMULATIVA] AssessmentFormId existente: ${assessmentFormId}`);
      } else {
        // Crear nuevo AssessmentForm - sin FormVersion para evitar el error
        try {
          const insertFormResult = await new sql.Request(transaction)
            .input('assessmentId', sql.Int, assessmentId)
            .query(`
              INSERT INTO AssessmentForm (AssessmentId)
              OUTPUT INSERTED.AssessmentFormId
              VALUES (@assessmentId)
            `);
            
          if (insertFormResult.recordset.length > 0) {
            assessmentFormId = insertFormResult.recordset[0].AssessmentFormId;
            console.log(`[GUARDAR_ACUMULATIVA] Creado nuevo AssessmentFormId: ${assessmentFormId}`);
          } else {
            await transaction.rollback();
            return res.status(500).json({ error: 'No se pudo crear AssessmentForm' });
          }
        } catch (formError) {
          console.error('[GUARDAR_ACUMULATIVA][ERROR] Error al crear AssessmentForm:', formError);
          await transaction.rollback();
          return res.status(500).json({ error: 'Error al crear AssessmentForm: ' + formError.message });
        }
      }
      
      // Crear subtests para las subnotas (mínimo 2)
      const cantidadSubnotas = Math.max(2, subnotas[0]?.notas?.length || 2);
      console.log(`[GUARDAR_ACUMULATIVA] Creando ${cantidadSubnotas} subtests`);
      
      subtestIds = [];
      
      for (let i = 1; i <= cantidadSubnotas; i++) {
        const insertSubtestResult = await new sql.Request(transaction)
          .input('formId', sql.Int, assessmentFormId)
          .input('identifier', sql.NVarChar, `N1.${i}`)
          .input('title', sql.NVarChar, `Subnota ${i}`)
          .input('tipoId', sql.Int, 1) // Tipo directo para las subnotas
          .query(`
            INSERT INTO AssessmentSubtest (
              AssessmentFormId, 
              Identifier, 
              Title,
              RefAssessmentSubtestTypeId
            )
            OUTPUT INSERTED.AssessmentSubtestId
            VALUES (
              @formId,
              @identifier,
              @title,
              @tipoId
            )
          `);
          
        if (insertSubtestResult.recordset.length > 0) {
          const subtestId = insertSubtestResult.recordset[0].AssessmentSubtestId;
          subtestIds.push(subtestId);
          console.log(`[GUARDAR_ACUMULATIVA] Creado subtest ${i} con ID: ${subtestId}`);
        }
      }
      
      if (subtestIds.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'No se pudieron crear subnotas (AssessmentSubtest) para el assessmentId proporcionado' });
      }
    }

    // Procesar cada alumno
    for (const alumno of subnotas) {
      let registrationId = alumno.assessmentRegistrationId;
      
      console.log(`[DEBUG] Procesando alumno:`, {
        assessmentRegistrationId: registrationId,
        organizationPersonRoleId: alumno.organizationPersonRoleId,
        notas: alumno.notas
      });

      // Si no tiene registrationId, intentar crearlo
      if (!registrationId) {
        try {
          if (alumno.organizationPersonRoleId) {
            // Obtener el PersonId del OrganizationPersonRoleId
            const personResult = await new sql.Request(transaction)
              .input('organizationPersonRoleId', sql.Int, alumno.organizationPersonRoleId)
              .query(`
                SELECT PersonId 
                FROM OrganizationPersonRole 
                WHERE OrganizationPersonRoleId = @organizationPersonRoleId
              `);

            if (personResult.recordset.length > 0) {
              const personId = personResult.recordset[0].PersonId;

              // Verificar si ya existe un registro para esta persona en esta administración
              const checkResult = await new sql.Request(transaction)
                .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
                .input('personId', sql.Int, personId)
                .query(`
                  SELECT AssessmentRegistrationId 
                  FROM AssessmentRegistration 
                  WHERE AssessmentAdministrationId = @assessmentAdministrationId 
                    AND PersonId = @personId
                `);

              if (checkResult.recordset.length > 0) {
                registrationId = checkResult.recordset[0].AssessmentRegistrationId;
                console.log(`[GUARDAR_ACUMULATIVA] AssessmentRegistrationId existente encontrado: ${registrationId}`);
              } else {
                // Crear un nuevo registro de inscripción
                const insertResult = await new sql.Request(transaction)
                  .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
                  .input('personId', sql.Int, personId)
                  .input('cursoId', sql.Int, cursoId)
                  .input('asignaturaId', sql.Int, asignaturaId)
                  .query(`
                    INSERT INTO AssessmentRegistration (
                      AssessmentAdministrationId, 
                      PersonId,
                      OrganizationId,
                      CourseSectionOrganizationId
                    ) 
                    OUTPUT INSERTED.AssessmentRegistrationId
                    VALUES (
                      @assessmentAdministrationId,
                      @personId,
                      @cursoId,
                      @asignaturaId
                    )
                  `);
                  
                if (insertResult.recordset.length > 0) {
                  registrationId = insertResult.recordset[0].AssessmentRegistrationId;
                  console.log(`[GUARDAR_ACUMULATIVA] Creado nuevo AssessmentRegistrationId: ${registrationId}`);
                  registrosCreados++;
                } else {
                  console.error(`[ERROR] No se pudo crear AssessmentRegistration para PersonId: ${personId}`);
                }
              }
            } else {
              console.error(`[ERROR] No se encontró PersonId para OrganizationPersonRoleId: ${alumno.organizationPersonRoleId}`);
            }
          }
        } catch (error) {
          console.error(`[ERROR] Error al procesar estudiante:`, error);
        }
      }

      if (!registrationId || isNaN(registrationId)) {
        console.warn(`[GUARDAR_ACUMULATIVA] Registro omitido por ID inválido:`, alumno);
        registrosOmitidos++;
        continue;
      }
      
      // Verificar si el registro existe
      const checkRegResult = await new sql.Request(transaction)
        .input('regId', sql.Int, registrationId)
        .query('SELECT AssessmentRegistrationId FROM AssessmentRegistration WHERE AssessmentRegistrationId = @regId');
        
      if (checkRegResult.recordset.length === 0) {
        console.error(`[ERROR] El AssessmentRegistrationId ${registrationId} no existe`);
        registrosOmitidos++;
        continue; // Saltar este registro y continuar con el siguiente
      }

      // PRIMERO: Eliminar TODAS las notas previas relacionadas con este registro y estos subtests
      // Esto evitará duplicados
      await new sql.Request(transaction)
        .input('AssessmentRegistrationId', sql.Int, registrationId)
        .input('AssessmentId', sql.Int, assessmentId)
        .query(`
          DELETE FROM AssessmentResult 
          WHERE AssessmentRegistrationId = @AssessmentRegistrationId
          AND AssessmentSubtestId IN (
            SELECT ast.AssessmentSubtestId 
            FROM AssessmentSubtest ast
            INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
            WHERE af.AssessmentId = @AssessmentId
          )
        `);

      console.log(`[GUARDAR_ACUMULATIVA] Notas acumulativas previas eliminadas para registrationId: ${registrationId}`);

      // Insertar subnotas
      let notasValidas = 0;
      let sumaNotas = 0;
      
      if (Array.isArray(alumno.notas)) {
        console.log(`[DEBUG] Notas a insertar para ${registrationId}:`, alumno.notas);
        console.log(`[DEBUG] Usando subtestIds:`, subtestIds);
        
        for (let i = 0; i < alumno.notas.length && i < subtestIds.length; i++) {
          const nota = alumno.notas[i];
          const subtestId = subtestIds[i];
          console.log(`[DEBUG] Procesando nota[${i}]: ${nota}, tipo: ${typeof nota}, para subtestId: ${subtestId}`);

          if (nota !== null && nota !== undefined && !isNaN(parseFloat(nota))) {
            const notaRedondeada = Math.round(parseFloat(nota) * 10) / 10;
            console.log(`[DEBUG] Insertando subnota ${i} con valor: ${notaRedondeada} (original: ${nota}) para subtestId: ${subtestId}`);

            try {
              // Insertar nuevo registro - ELIMINADO DateCreated de la inserción
              await new sql.Request(transaction)
                .input('RegId', sql.Int, registrationId)
                .input('SubtestId', sql.Int, subtestId)
                .input('Nota', sql.Decimal(4, 1), notaRedondeada)
                .query(`
                  INSERT INTO AssessmentResult
                  (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage)
                  VALUES (@RegId, @SubtestId, @Nota, 0)
                `);
                
              console.log(`[GUARDAR_ACUMULATIVA] Subnota insertada para ${registrationId} - nota[${i}]: ${notaRedondeada}, subtestId: ${subtestId}`);
              notasInsertadas++;
              notasValidas++;
              sumaNotas += notaRedondeada;
            } catch (insertError) {
              console.error(`[ERROR] Error al insertar subnota ${i}:`, insertError);
            }
          } else {
            console.warn(`[GUARDAR_ACUMULATIVA] Nota inválida omitida en alumno ${registrationId}, índice ${i}:`, nota);
          }
        }
      }

      // Calcular e insertar promedio
      let promedio = 0;
      if (notasValidas > 0) {
        promedio = Math.round((sumaNotas / notasValidas) * 10) / 10;
      }

      // Usar el primer subtestId para el promedio
      const subtestId = subtestIds[0];

      // Insertar promedio - ELIMINADO DateCreated de la inserción
      await new sql.Request(transaction)
        .input('RegId', sql.Int, registrationId)
        .input('SubtestId', sql.Int, subtestId)
        .input('Promedio', sql.Decimal(4, 1), promedio)
        .query(`
          INSERT INTO AssessmentResult
          (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue, IsAverage)
          VALUES (@RegId, @SubtestId, @Promedio, 1)
        `);
        
      console.log(`[GUARDAR_ACUMULATIVA] Promedio insertado para ${registrationId}: ${promedio}, subtestId: ${subtestId}`);
      promediosInsertados++;
      
      // Insertar nota principal - ELIMINADO DateCreated de la inserción
      await new sql.Request(transaction)
        .input('RegId', sql.Int, registrationId)
        .input('SubtestId', sql.Int, subtestId)
        .input('Promedio', sql.Decimal(4, 1), promedio)
        .query(`
          INSERT INTO AssessmentResult
          (AssessmentRegistrationId, AssessmentSubtestId, ScoreValue)
          VALUES (@RegId, @SubtestId, @Promedio)
        `);
        
      console.log(`[GUARDAR_ACUMULATIVA] Nota principal creada para ${registrationId}: ${promedio}, subtestId: ${subtestId}`);
      notasPrincipalesActualizadas++;
    }

    await transaction.commit();
    console.log('[GUARDAR_ACUMULATIVA] Proceso finalizado exitosamente');
    console.log(`[ESTADÍSTICAS] Notas insertadas: ${notasInsertadas}, Promedios insertados: ${promediosInsertados}, Registros omitidos: ${registrosOmitidos}, Notas principales actualizadas: ${notasPrincipalesActualizadas}, Registros creados: ${registrosCreados}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Notas acumulativas guardadas correctamente',
      stats: {
        notasInsertadas,
        promediosInsertados,
        registrosOmitidos,
        notasPrincipalesActualizadas,
        registrosCreados
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
    const { cursoId, asignaturaId, columnas } = req.body;

    if (!cursoId || !asignaturaId) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const pool = await poolPromise;
    const request = pool.request();

    console.log(`[GET_NOTAS_ACUMULADAS] cursoId=${cursoId}, asignaturaId=${asignaturaId}`);

    // Obtener todos los estudiantes del curso
    const query = `
      SELECT 
          p.PersonId,
          p.FirstName,
          p.LastName,
        p.SecondLastName,
        opr.OrganizationPersonRoleId
      FROM OrganizationPersonRole opr
      INNER JOIN Person p ON p.PersonId = opr.PersonId
      WHERE opr.OrganizationId = @cursoId
        AND opr.RoleId = 6 -- Estudiantes
      ORDER BY p.LastName, p.FirstName
    `;

    const result = await request
      .input('cursoId', sql.Int, cursoId)
      .query(query);

    // Obtener el AssessmentAdministrationId para el assessmentId
    let assessmentAdministrationId = null;
    if (columnas && columnas.length > 0) {
      const assessmentId = columnas[0]; // Usar el primer assessmentId
      const adminResult = await pool.request()
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 aa.AssessmentAdministrationId
          FROM Assessment_AssessmentAdministration aa
          WHERE aa.AssessmentId = @assessmentId
        `);

      if (adminResult.recordset.length > 0) {
        assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
        console.log(`[GET_NOTAS_ACUMULADAS] AssessmentAdministrationId encontrado: ${assessmentAdministrationId}`);
      }
    }

    // Para cada estudiante, verificar si tiene un registro de inscripción
    const estudiantes = [];
    for (const est of result.recordset) {
      const estudiante = {
        FirstName: est.FirstName,
        LastName: est.LastName,
        SecondLastName: est.SecondLastName,
        PersonId: est.PersonId,
        OrganizationPersonRoleId: est.OrganizationPersonRoleId,
        AssessmentRegistrationId: null
      };

      // Si tenemos un AssessmentAdministrationId, buscar el registro de inscripción
      if (assessmentAdministrationId) {
        const regResult = await pool.request()
          .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('personId', sql.Int, est.PersonId)
          .query(`
            SELECT AssessmentRegistrationId
            FROM AssessmentRegistration
            WHERE AssessmentAdministrationId = @assessmentAdministrationId
              AND PersonId = @personId
          `);

        if (regResult.recordset.length > 0) {
          estudiante.AssessmentRegistrationId = regResult.recordset[0].AssessmentRegistrationId;
        }
      }

      estudiantes.push(estudiante);
    }

    console.log(`[GET_NOTAS_ACUMULADAS] Estudiantes encontrados: ${estudiantes.length}`);
    res.status(200).json(estudiantes);
  } catch (error) {
    console.error('[GET_NOTAS_ACUMULADAS][ERROR]', error);
    res.status(500).json({ success: false, message: 'Error al obtener estudiantes para notas acumulativas', error: error.message });
  }
};


// aqui2
// POST /api/notas/crear-assessment-registrations
exports.crearAssessmentRegistrations = async (req, res) => {
  const { assessmentId, estudiantes } = req.body;

  if (!assessmentId || !Array.isArray(estudiantes)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // Obtener AssessmentAdministrationId
    const adminResult = await new sql.Request(transaction)
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);

    if (adminResult.recordset.length === 0) {
      console.error(`[ERROR crearAssessmentRegistrations] No se encontró AssessmentAdministrationId para assessmentId: ${assessmentId}`);
      await transaction.rollback();
      return res.status(404).json({ error: 'No se encontró AssessmentAdministrationId' });
    }

    const assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
    console.log(`[INFO] Usando AssessmentAdministrationId: ${assessmentAdministrationId} para assessmentId: ${assessmentId}`);

    const registrosCreados = [];
    const registrosExistentes = [];
    const registrosOmitidos = [];

    for (const estudiante of estudiantes) {
      // Verificar datos mínimos necesarios
      if (!estudiante.personId) {
        console.warn(`[WARN crearAssessmentRegistrations] Estudiante omitido por falta de personId`);
        registrosOmitidos.push(estudiante);
        continue;
      }

      const organizationId = estudiante.organizationId || req.body.cursoId;
      const courseSectionOrgId = estudiante.courseSectionOrgId || req.body.asignaturaId;

      if (!organizationId) {
        console.warn(`[WARN crearAssessmentRegistrations] Estudiante omitido por falta de organizationId (cursoId)`);
        registrosOmitidos.push(estudiante);
        continue;
      }

      try {
        // Verificar si ya existe un registro para este estudiante
        const checkResult = await new sql.Request(transaction)
        .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('personId', sql.Int, estudiante.personId)
        .query(`
          SELECT AssessmentRegistrationId
          FROM AssessmentRegistration
            WHERE AssessmentAdministrationId = @assessmentAdministrationId
              AND PersonId = @personId
          `);

        if (checkResult.recordset.length > 0) {
          // Ya existe un registro
          registrosExistentes.push({
            ...estudiante,
            assessmentRegistrationId: checkResult.recordset[0].AssessmentRegistrationId
          });
          continue;
        }

        // Crear nuevo registro
        const insertResult = await new sql.Request(transaction)
          .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('personId', sql.Int, estudiante.personId)
          .input('organizationId', sql.Int, organizationId)
          .input('courseSectionOrgId', sql.Int, courseSectionOrgId)
          .query(`
            INSERT INTO AssessmentRegistration (
              AssessmentAdministrationId,
              PersonId,
              OrganizationId,
              CourseSectionOrganizationId,
              DateCreated
            )
            OUTPUT INSERTED.AssessmentRegistrationId
            VALUES (
              @assessmentAdministrationId,
              @personId,
              @organizationId,
              @courseSectionOrgId,
              GETDATE()
            )
          `);
          
        if (insertResult.recordset.length > 0) {
          registrosCreados.push({
            ...estudiante,
            assessmentRegistrationId: insertResult.recordset[0].AssessmentRegistrationId
          });
        }
      } catch (error) {
        console.error(`[ERROR crearAssessmentRegistrations] Error al procesar estudiante:`, error);
        registrosOmitidos.push(estudiante);
      }
    }

    await transaction.commit();

    console.log(`[INFO crearAssessmentRegistrations] Registros creados: ${registrosCreados.length}, existentes: ${registrosExistentes.length}, omitidos: ${registrosOmitidos.length}`);

    res.status(200).json({
      message: 'Registros de inscripción procesados',
      creados: registrosCreados,
      existentes: registrosExistentes,
      omitidos: registrosOmitidos
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[ERROR crearAssessmentRegistrations]', error);
    res.status(500).json({ error: 'Error al crear registros de inscripción' });
  }
};




// DELETE /api/notas/limpiar-datos-previos
exports.limpiarDatosPrevios = async (req, res) => {
  try {
    const { assessmentId, cursoId, asignaturaId, columna, tipoNuevo } = req.body;

    if (!assessmentId || !cursoId || !asignaturaId || !columna) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    console.log(`[LIMPIAR_DATOS] Iniciando limpieza para assessmentId: ${assessmentId}, columna: ${columna}, cambiando a tipo: ${tipoNuevo}`);

    try {
      // 1. Verificar si existen notas mayores o iguales a 1
      const checkNotasResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .input('cursoId', sql.Int, cursoId)
        .input('asignaturaId', sql.Int, asignaturaId)
        .query(`
          SELECT COUNT(*) AS NotasCount
          FROM AssessmentResult ar
          INNER JOIN AssessmentRegistration reg ON ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
          WHERE reg.AssessmentAdministrationId = @assessmentId
            AND reg.OrganizationId = @cursoId
            AND reg.CourseSectionOrganizationId = @asignaturaId
            AND ar.ScoreValue >= 1.0
        `);

      const notasCount = checkNotasResult.recordset[0].NotasCount;
      console.log(`[LIMPIAR_DATOS] Notas mayores o iguales a 1 encontradas: ${notasCount}`);

      if (notasCount > 0) {
        // 2. Eliminar registros de AssessmentResult relacionados donde ScoreValue >= 1
        const deleteResultResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .input('cursoId', sql.Int, cursoId)
          .input('asignaturaId', sql.Int, asignaturaId)
          .query(`
            DELETE FROM AssessmentResult
            WHERE AssessmentRegistrationId IN (
              SELECT ar.AssessmentRegistrationId 
              FROM AssessmentRegistration ar
              WHERE ar.AssessmentAdministrationId = @assessmentId
                AND ar.OrganizationId = @cursoId
                AND ar.CourseSectionOrganizationId = @asignaturaId
            )
            AND ScoreValue >= 1.0
        `);

      console.log(`[LIMPIAR_DATOS] Registros eliminados de AssessmentResult: ${deleteResultResult.rowsAffected[0]}`);

        // 3. Eliminar registros de AssessmentRegistration si no tienen otros resultados
      const deleteRegistrationResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .input('cursoId', sql.Int, cursoId)
        .input('asignaturaId', sql.Int, asignaturaId)
        .query(`
            DELETE FROM AssessmentRegistration
            WHERE AssessmentAdministrationId = @assessmentId
              AND OrganizationId = @cursoId
              AND CourseSectionOrganizationId = @asignaturaId
            AND NOT EXISTS (
              SELECT 1 FROM AssessmentResult ar 
                WHERE ar.AssessmentRegistrationId = AssessmentRegistrationId
            )
        `);

      console.log(`[LIMPIAR_DATOS] Registros eliminados de AssessmentRegistration: ${deleteRegistrationResult.rowsAffected[0]}`);

      await transaction.commit();

      res.status(200).json({
        message: 'Datos previos limpiados correctamente',
        resultadosEliminados: deleteResultResult.rowsAffected[0],
        registrosEliminados: deleteRegistrationResult.rowsAffected[0]
      });
      } else {
        // No hay notas mayores o iguales a 1, no es necesario eliminar
        await transaction.commit();
        res.status(200).json({
          message: 'No se encontraron notas mayores o iguales a 1 para eliminar',
          resultadosEliminados: 0,
          registrosEliminados: 0
        });
      }

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

    if (!assessmentId || !cursoId || !asignaturaId) {
      return res.status(400).json({ error: 'Parámetros requeridos faltantes' });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      console.log(`[CARGAR_EXISTENTES] Buscando notas para assessmentId: ${assessmentId}, cursoId: ${cursoId}, asignaturaId: ${asignaturaId}`);

      // 1. Primero obtenemos el AssessmentAdministrationId correspondiente al assessmentId
      const adminResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 aa.AssessmentAdministrationId
          FROM Assessment_AssessmentAdministration aa
          WHERE aa.AssessmentId = @assessmentId
        `);

      let assessmentAdministrationId;

      if (adminResult.recordset.length === 0) {
        console.log(`[CARGAR_EXISTENTES] No se encontró AssessmentAdministrationId para assessmentId: ${assessmentId}. Creando uno nuevo.`);
        
        // Crear un nuevo AssessmentAdministration
        const insertAdminResult = await new sql.Request(transaction)
          .input('fecha', sql.Date, new Date())
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
            
          console.log(`[CARGAR_EXISTENTES] Creado nuevo AssessmentAdministrationId: ${assessmentAdministrationId}`);
        } else {
          throw new Error('No se pudo crear AssessmentAdministration');
        }
      } else {
        assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
        console.log(`[CARGAR_EXISTENTES] AssessmentAdministrationId encontrado: ${assessmentAdministrationId}`);
      }

      // 2. Obtener los AssessmentSubtestId relacionados con este assessmentId
      const subtestResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT ast.AssessmentSubtestId, ast.Identifier 
          FROM AssessmentSubtest ast
          INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
          WHERE af.AssessmentId = @assessmentId
          ORDER BY ast.AssessmentSubtestId
        `);
          
      let subtestIds = subtestResult.recordset.map(r => r.AssessmentSubtestId);
      const subtestDetails = subtestResult.recordset;
      console.log(`[CARGAR_EXISTENTES] AssessmentSubtestIds encontrados:`, subtestIds);
      console.log(`[CARGAR_EXISTENTES] Detalles de subtests:`, JSON.stringify(subtestDetails));
      
      // Si no hay subtests, crearlos
      if (subtestIds.length === 0) {
        console.log(`[CARGAR_EXISTENTES] No se encontraron subtests para assessmentId: ${assessmentId}. Creando subtests.`);
        
        // Verificar si existe AssessmentForm
        const formResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .query(`
            SELECT TOP 1 AssessmentFormId
            FROM AssessmentForm
            WHERE AssessmentId = @assessmentId
          `);
          
        let assessmentFormId;
        
        if (formResult.recordset.length > 0) {
          assessmentFormId = formResult.recordset[0].AssessmentFormId;
          console.log(`[CARGAR_EXISTENTES] AssessmentFormId existente: ${assessmentFormId}`);
        } else {
          // Crear nuevo AssessmentForm - Quitamos FormVersion que causa el error
          try {
            const insertFormResult = await new sql.Request(transaction)
              .input('assessmentId', sql.Int, assessmentId)
              .query(`
                INSERT INTO AssessmentForm (AssessmentId)
                OUTPUT INSERTED.AssessmentFormId
                VALUES (@assessmentId)
              `);
              
            if (insertFormResult.recordset.length > 0) {
              assessmentFormId = insertFormResult.recordset[0].AssessmentFormId;
              console.log(`[CARGAR_EXISTENTES] Creado nuevo AssessmentFormId: ${assessmentFormId}`);
            } else {
              throw new Error('No se pudo crear AssessmentForm');
            }
          } catch (formError) {
            console.error('[CARGAR_EXISTENTES][ERROR]', formError);
            throw new Error('Error al crear AssessmentForm: ' + formError.message);
          }
        }
        
        // Crear 2 subtests por defecto
        subtestIds = [];
        
        for (let i = 1; i <= 2; i++) {
          const insertSubtestResult = await new sql.Request(transaction)
            .input('formId', sql.Int, assessmentFormId)
            .input('identifier', sql.NVarChar, `N1.${i}`)
            .input('title', sql.NVarChar, `Subnota ${i}`)
            .input('tipoId', sql.Int, 1) // Tipo directo para las subnotas
            .query(`
              INSERT INTO AssessmentSubtest (
                AssessmentFormId, 
                Identifier, 
                Title,
                RefAssessmentSubtestTypeId
              )
              OUTPUT INSERTED.AssessmentSubtestId
              VALUES (
                @formId,
                @identifier,
                @title,
                @tipoId
              )
            `);
            
          if (insertSubtestResult.recordset.length > 0) {
            const subtestId = insertSubtestResult.recordset[0].AssessmentSubtestId;
            subtestIds.push(subtestId);
            console.log(`[CARGAR_EXISTENTES] Creado subtest ${i} con ID: ${subtestId}`);
          }
        }
      }

      // 3. Obtener todos los estudiantes del curso
      const estudiantesQuery = `
        SELECT 
          opr.OrganizationPersonRoleId,
          p.PersonId,
          p.FirstName,
          p.LastName,
          p.SecondLastName
        FROM OrganizationPersonRole opr
        INNER JOIN Person p ON opr.PersonId = p.PersonId
        WHERE opr.OrganizationId = @cursoId
          AND opr.RoleId = 6 -- Estudiantes
        ORDER BY p.LastName, p.FirstName
      `;
      
      const estudiantesResult = await new sql.Request(transaction)
        .input('cursoId', sql.Int, cursoId)
        .query(estudiantesQuery);
      
      // 4. Para cada estudiante, buscar su AssessmentRegistrationId y sus notas
      const estudiantesConNotas = [];
      
      for (const estudiante of estudiantesResult.recordset) {
        // Buscar el AssessmentRegistrationId para este estudiante
        const registroQuery = `
          SELECT ar.AssessmentRegistrationId
          FROM AssessmentRegistration ar
          WHERE ar.AssessmentAdministrationId = @assessmentAdministrationId
            AND ar.PersonId = @personId
            AND ar.OrganizationId = @cursoId
        `;

        const registroResult = await new sql.Request(transaction)
          .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
          .input('personId', sql.Int, estudiante.PersonId)
          .input('cursoId', sql.Int, cursoId)
          .query(registroQuery);
        
        let registrationId = null;
        if (registroResult.recordset.length > 0) {
          registrationId = registroResult.recordset[0].AssessmentRegistrationId;
        } else {
          // Si no existe un registro para este estudiante, crearlo
          const insertRegResult = await new sql.Request(transaction)
            .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
            .input('personId', sql.Int, estudiante.PersonId)
            .input('cursoId', sql.Int, cursoId)
            .input('asignaturaId', sql.Int, asignaturaId)
            .query(`
              INSERT INTO AssessmentRegistration (
                AssessmentAdministrationId, 
                PersonId,
                OrganizationId,
                CourseSectionOrganizationId
              ) 
              OUTPUT INSERTED.AssessmentRegistrationId
              VALUES (
                @assessmentAdministrationId,
                @personId,
                @cursoId,
                @asignaturaId
              )
            `);
            
          if (insertRegResult.recordset.length > 0) {
            registrationId = insertRegResult.recordset[0].AssessmentRegistrationId;
            console.log(`[CARGAR_EXISTENTES] Creado nuevo AssessmentRegistrationId: ${registrationId} para estudiante ${estudiante.FirstName} ${estudiante.LastName}`);
          }
        }
        
        const estudianteData = {
          nombre: `${estudiante.FirstName} ${estudiante.LastName} ${estudiante.SecondLastName || ''}`.trim(),
          assessmentRegistrationId: registrationId,
          personId: estudiante.PersonId,
          organizationPersonRoleId: estudiante.OrganizationPersonRoleId,
          firstName: estudiante.FirstName,
          lastName: estudiante.LastName,
          secondLastName: estudiante.SecondLastName,
          notas: Array(subtestIds.length).fill(null),
          pesos: Array(subtestIds.length).fill(100/subtestIds.length),
          promedio: null
        };
        
        // Si tiene registrationId, buscar sus notas
        if (registrationId) {
          // Obtener todas las notas para este registro (subnotas y promedio)
          const notasQuery = `
            SELECT 
              ar.ScoreValue,
              ar.IsAverage,
              ar.AssessmentSubtestId
            FROM AssessmentResult ar
            WHERE ar.AssessmentRegistrationId = @regId
              AND ar.AssessmentSubtestId IN (${subtestIds.join(',')})
            ORDER BY ar.IsAverage, ar.AssessmentSubtestId
          `;
          
          const notasResult = await new sql.Request(transaction)
            .input('regId', sql.Int, registrationId)
            .query(notasQuery);
          
          // Procesar las notas encontradas
          for (const nota of notasResult.recordset) {
            if (nota.IsAverage === 1) {
              // Es un promedio
              estudianteData.promedio = nota.ScoreValue;
            } else if (nota.IsAverage === 0) {
              // Es una subnota individual
              // Encontrar el índice correspondiente en el array de subnotas
              const subtestIndex = subtestIds.findIndex(id => id === nota.AssessmentSubtestId);
              if (subtestIndex !== -1) {
                estudianteData.notas[subtestIndex] = nota.ScoreValue;
              }
            } else if (nota.IsAverage === null && estudianteData.promedio === null) {
              // Si es la nota principal y no tenemos promedio, usarla como promedio
              estudianteData.promedio = nota.ScoreValue;
            }
          }
        }
        
        estudiantesConNotas.push(estudianteData);
      }
      
      console.log(`[CARGAR_EXISTENTES] Total estudiantes procesados: ${estudiantesConNotas.length}`);
      console.log(`[CARGAR_EXISTENTES] Ejemplo primer estudiante:`, estudiantesConNotas.length > 0 ? JSON.stringify(estudiantesConNotas[0]) : 'No hay estudiantes');
      
      await transaction.commit();
      res.status(200).json(estudiantesConNotas);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[CARGAR_EXISTENTES][ERROR]', error);
    res.status(500).json({ error: 'Error al cargar notas acumulativas existentes: ' + error.message });
  }
};

// POST /api/notas/obtener-assessment-registrations
exports.obtenerAssessmentRegistrations = async (req, res) => {
  const { assessmentId, organizationPersonRoleIds } = req.body;

  if (!assessmentId || !Array.isArray(organizationPersonRoleIds)) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  try {
    const pool = await poolPromise;

    // 1. Obtener el AssessmentAdministrationId a partir del AssessmentId
    const adminResult = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);

    const assessmentAdministrationId = adminResult.recordset[0]?.AssessmentAdministrationId;

    if (!assessmentAdministrationId) {
      return res.status(404).json({ error: 'No se encontró AssessmentAdministrationId para el AssessmentId dado.' });
    }

    // 2. Construir la consulta para obtener los registros de inscripción
    // Usamos la tabla OrganizationPersonRole para vincular con los IDs proporcionados
    const query = `
      SELECT 
        AR.AssessmentRegistrationId,
        OPR.OrganizationPersonRoleId,
        AR.PersonId
      FROM 
        AssessmentRegistration AR
      INNER JOIN 
        OrganizationPersonRole OPR ON AR.PersonId = OPR.PersonId
      WHERE 
        AR.AssessmentAdministrationId = @assessmentAdministrationId
        AND OPR.OrganizationPersonRoleId IN (${organizationPersonRoleIds.map((_, i) => `@id${i}`).join(',')})
    `;

    const request = pool.request()
      .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId);

    // Añadir parámetros dinámicamente para los IDs
    organizationPersonRoleIds.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, id);
    });

    const result = await request.query(query);

    console.log(`[obtenerAssessmentRegistrations] Registros encontrados: ${result.recordset.length}`);
    res.json(result.recordset);

  } catch (error) {
    console.error('[ERROR obtenerAssessmentRegistrations]', error);
    res.status(500).json({ error: 'Error al obtener registros de inscripción' });
  }
};

// GET /api/notas/assessment-administration/:assessmentId
exports.getAssessmentAdministration = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    if (!assessmentId) {
      return res.status(400).json({ error: 'AssessmentId es requerido' });
    }
    
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('assessmentId', sql.Int, assessmentId)
      .query(`
        SELECT TOP 1 aa.AssessmentAdministrationId
        FROM Assessment_AssessmentAdministration aa
        WHERE aa.AssessmentId = @assessmentId
      `);
      
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró AssessmentAdministrationId para el AssessmentId proporcionado' });
    }
    
    res.status(200).json({ 
      assessmentAdministrationId: result.recordset[0].AssessmentAdministrationId 
    });
  } catch (error) {
    console.error('[ERROR] Error al obtener AssessmentAdministrationId:', error);
    res.status(500).json({ error: 'Error al obtener AssessmentAdministrationId' });
  }
};

// POST /api/notas/crear-registro
exports.crearRegistro = async (req, res) => {
  try {
    const { assessmentAdministrationId, organizationPersonRoleId, cursoId, asignaturaId } = req.body;
    
    if (!assessmentAdministrationId || !organizationPersonRoleId || !cursoId) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    
    const pool = await poolPromise;
    
    // Primero, obtener el PersonId del OrganizationPersonRoleId
    const personResult = await pool.request()
      .input('organizationPersonRoleId', sql.Int, organizationPersonRoleId)
      .query(`
        SELECT PersonId 
        FROM OrganizationPersonRole 
        WHERE OrganizationPersonRoleId = @organizationPersonRoleId
      `);
      
    if (personResult.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró la persona asociada al OrganizationPersonRoleId' });
    }
    
    const personId = personResult.recordset[0].PersonId;
    
    // Verificar si ya existe un registro para esta persona en esta administración
    const checkResult = await pool.request()
      .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
      .input('personId', sql.Int, personId)
      .query(`
        SELECT AssessmentRegistrationId 
        FROM AssessmentRegistration 
        WHERE AssessmentAdministrationId = @assessmentAdministrationId 
          AND PersonId = @personId
      `);
      
    // Si ya existe, devolver ese ID
    if (checkResult.recordset.length > 0) {
      return res.status(200).json({ 
        assessmentRegistrationId: checkResult.recordset[0].AssessmentRegistrationId,
        message: 'El registro ya existía'
      });
    }
    
    // Si no existe, crear uno nuevo
    const insertResult = await pool.request()
      .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
      .input('personId', sql.Int, personId)
      .input('cursoId', sql.Int, cursoId)
      .input('asignaturaId', sql.Int, asignaturaId || null)
      .query(`
        INSERT INTO AssessmentRegistration (
          AssessmentAdministrationId, 
          PersonId,
          OrganizationId,
          CourseSectionOrganizationId,
          DateCreated
        ) 
        VALUES (
          @assessmentAdministrationId, 
          @personId,
          @cursoId,
          @asignaturaId,
          GETDATE()
        );
        
        SELECT SCOPE_IDENTITY() AS AssessmentRegistrationId;
      `);
      
    const assessmentRegistrationId = insertResult.recordset[0].AssessmentRegistrationId;
    
    res.status(201).json({ 
      assessmentRegistrationId,
      message: 'Registro creado exitosamente'
    });
  } catch (error) {
    console.error('[ERROR] Error al crear registro de inscripción:', error);
    res.status(500).json({ error: 'Error al crear registro de inscripción' });
  }
};

// POST /api/notas/crear-subnotas
exports.crearSubnotas = async (req, res) => {
  try {
    const { assessmentId, columna, cantidadSubnotas } = req.body;
    
    if (!assessmentId || !columna || !cantidadSubnotas || cantidadSubnotas < 2) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos o cantidad de subnotas inválida' });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      console.log(`[CREAR_SUBNOTAS] Iniciando creación de ${cantidadSubnotas} subnotas para assessmentId: ${assessmentId}, columna: ${columna}`);
      
      // 1. Verificar si ya existen subnotas para este assessmentId
      const checkSubtestsResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT ast.AssessmentSubtestId, ast.Identifier
          FROM AssessmentSubtest ast
          INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
          WHERE af.AssessmentId = @assessmentId
        `);
      
      if (checkSubtestsResult.recordset.length > 0) {
        console.log(`[CREAR_SUBNOTAS] Ya existen ${checkSubtestsResult.recordset.length} subnotas para assessmentId: ${assessmentId}`);
        
        // Devolver las subnotas existentes
        await transaction.commit();
        return res.status(200).json({
          message: `Ya existen ${checkSubtestsResult.recordset.length} subnotas para este assessment`,
          subtests: checkSubtestsResult.recordset.map(st => ({
            id: st.AssessmentSubtestId,
            identifier: st.Identifier
          }))
        });
      }
      
      // 2. Obtener AssessmentFormId relacionado con el Assessment
      const formResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 af.AssessmentFormId
          FROM AssessmentForm af
          WHERE af.AssessmentId = @assessmentId
        `);
      
      let assessmentFormId;
      
      if (formResult.recordset.length === 0) {
        // Si no existe un form, crearlo
        console.log(`[CREAR_SUBNOTAS] No se encontró AssessmentForm para assessmentId: ${assessmentId}, creando uno nuevo`);
        
        const createFormResult = await new sql.Request(transaction)
          .input('assessmentId', sql.Int, assessmentId)
          .input('name', sql.NVarChar(40), columna)
          .input('publishedDate', sql.Date, new Date())
          .query(`
            INSERT INTO AssessmentForm (AssessmentId, Name, PublishedDate)
            OUTPUT INSERTED.AssessmentFormId
            VALUES (@assessmentId, @name, @publishedDate)
          `);
          
        assessmentFormId = createFormResult.recordset[0].AssessmentFormId;
      } else {
        assessmentFormId = formResult.recordset[0].AssessmentFormId;
      }
      
      console.log(`[CREAR_SUBNOTAS] AssessmentFormId: ${assessmentFormId}`);
      
      // 3. Crear nuevas subnotas
      const createdSubtests = [];
      
      for (let i = 1; i <= cantidadSubnotas; i++) {
        const identifier = `${columna}.${i}`;
        const title = `Subnota ${i} de ${columna}`;
        
        const createSubtestResult = await new sql.Request(transaction)
          .input('assessmentFormId', sql.Int, assessmentFormId)
          .input('identifier', sql.NVarChar(40), identifier)
          .input('title', sql.NVarChar(60), title)
          .input('description', sql.NVarChar(100), `Subnota ${i} para evaluación ${columna}`)
          .input('refScoreMetricTypeId', sql.Int, 31) // Escala clásica
          .input('refAssessmentPurposeId', sql.Int, 23) // Sumativa
          .input('refAcademicSubjectId', sql.Int, 1)
          .input('refAssessmentSubtestTypeId', sql.Int, 1) // Tipo directo para subnotas
          .query(`
            INSERT INTO AssessmentSubtest (
              AssessmentFormId, Identifier, Title, Description,
              RefScoreMetricTypeId, RefAssessmentPurposeId, RefAcademicSubjectId,
              RefAssessmentSubtestTypeId
            )
            OUTPUT INSERTED.AssessmentSubtestId
            VALUES (
              @assessmentFormId, @identifier, @title, @description,
              @refScoreMetricTypeId, @refAssessmentPurposeId, @refAcademicSubjectId,
              @refAssessmentSubtestTypeId
            )
          `);
          
        createdSubtests.push({
          id: createSubtestResult.recordset[0].AssessmentSubtestId,
          identifier: identifier,
          title: title
        });
        
        console.log(`[CREAR_SUBNOTAS] Creada subnota ${identifier} con ID: ${createSubtestResult.recordset[0].AssessmentSubtestId}`);
      }
      
      await transaction.commit();
      
      res.status(200).json({
        message: `${cantidadSubnotas} subnotas creadas correctamente`,
        subtests: createdSubtests
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
      return res.status(400).json({ error: 'assessmentId es requerido' });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // 1. Obtener el AssessmentAdministrationId relacionado con este assessmentId
      const adminResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 aa.AssessmentAdministrationId
          FROM Assessment_AssessmentAdministration aa
          WHERE aa.AssessmentId = @assessmentId
        `);
        
      if (adminResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'No se encontró AssessmentAdministrationId para el assessmentId proporcionado' });
      }
      
      const assessmentAdministrationId = adminResult.recordset[0].AssessmentAdministrationId;
      
      // 2. Obtener el primer AssessmentSubtestId relacionado con este assessmentId
      const subtestResult = await new sql.Request(transaction)
        .input('assessmentId', sql.Int, assessmentId)
        .query(`
          SELECT TOP 1 ast.AssessmentSubtestId
          FROM AssessmentSubtest ast
          INNER JOIN AssessmentForm af ON ast.AssessmentFormId = af.AssessmentFormId
          WHERE af.AssessmentId = @assessmentId
          ORDER BY ast.AssessmentSubtestId
        `);
        
      if (subtestResult.recordset.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ error: 'No se encontraron subtests para el assessmentId proporcionado' });
      }
      
      const subtestId = subtestResult.recordset[0].AssessmentSubtestId;
      
      // 3. Encontrar registros con AssessmentSubtestId nulo
      const registrosNulosResult = await new sql.Request(transaction)
        .input('assessmentAdministrationId', sql.Int, assessmentAdministrationId)
        .query(`
          SELECT ar.AssessmentResultId, ar.AssessmentRegistrationId, ar.ScoreValue
          FROM AssessmentResult ar
          INNER JOIN AssessmentRegistration reg ON ar.AssessmentRegistrationId = reg.AssessmentRegistrationId
          WHERE reg.AssessmentAdministrationId = @assessmentAdministrationId
            AND ar.AssessmentSubtestId IS NULL
        `);
        
      const registrosNulos = registrosNulosResult.recordset;
      console.log(`[CORREGIR_NULOS] Encontrados ${registrosNulos.length} registros con AssessmentSubtestId nulo`);
      
      // 4. Actualizar los registros con AssessmentSubtestId nulo
      let registrosActualizados = 0;
      
      for (const registro of registrosNulos) {
        await new sql.Request(transaction)
          .input('resultId', sql.Int, registro.AssessmentResultId)
          .input('subtestId', sql.Int, subtestId)
          .query(`
            UPDATE AssessmentResult
            SET AssessmentSubtestId = @subtestId
            WHERE AssessmentResultId = @resultId
          `);
          
        registrosActualizados++;
      }
      
      await transaction.commit();
      
      res.status(200).json({
        message: `Se corrigieron ${registrosActualizados} registros con AssessmentSubtestId nulo`,
        registrosCorregidos: registrosActualizados
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('[CORREGIR_NULOS][ERROR]', error);
    res.status(500).json({ error: 'Error al corregir registros con AssessmentSubtestId nulo: ' + error.message });
  }
};

const sql = require('mssql');
const { poolPromise } = require('../../config/db'); // Asegúrate de que esta configuración es correcta

const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Asegurar carpeta de destino
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/justificativos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = file.fieldname + '-' + Date.now() + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });
exports.uploadJustificativos = upload.any(); // esto se usará en las rutas


// Eliminar bloque y registros relacionados
exports.eliminarBloque = async (req, res) => {
  const { scheduleId } = req.params;
  const { fecha, esRecreo } = req.query;

  if (!scheduleId) return res.status(400).json({ error: 'Falta el ID del bloque.' });

  try {
    const pool = await poolPromise;

    if (esRecreo == 1) {
      // Recreo: eliminar directamente
      await pool.request()
        .input('RecessId', sql.Int, scheduleId)
        .query('DELETE FROM RecessSchedule WHERE RecessScheduleId = @RecessId');
      return res.status(200).json({ message: 'Recreo eliminado correctamente.' });
    }

    // Verificar si hay asistencia registrada
    const asistencia = await pool.request()
      .input('scheduleId', sql.Int, scheduleId)
      .input('fecha', sql.Date, fecha)
      .query(`
        SELECT COUNT(*) AS Total
        FROM RoleAttendanceEvent rae
        INNER JOIN OrganizationPersonRole opr ON rae.OrganizationPersonRoleId = opr.OrganizationPersonRoleId
        INNER JOIN CourseSectionSchedule css ON css.OrganizationId = opr.OrganizationId
        WHERE css.CourseSectionScheduleId = @scheduleId
          AND rae.Date = @fecha
      `);

    const tieneAsistencia = asistencia.recordset[0].Total > 0;
    if (tieneAsistencia) {
      return res.status(403).json({ error: 'Este bloque no se puede eliminar porque ya tiene asistencia registrada.' });
    }

    // Eliminar OAs
    await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .query(`DELETE FROM CourseSectionScheduleObjective WHERE CourseSectionScheduleId = @ScheduleId`);

    // Eliminar Actividad
    await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .query(`DELETE FROM CourseSectionScheduleActivity WHERE CourseSectionScheduleId = @ScheduleId`);

    // Eliminar el bloque
    await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .query(`DELETE FROM CourseSectionSchedule WHERE CourseSectionScheduleId = @ScheduleId`);

    return res.status(200).json({ message: 'Bloque eliminado correctamente.' });
  } catch (error) {
    console.error("❌ Error al eliminar bloque:", error);
    return res.status(500).json({ error: 'Error al eliminar el bloque.' });
  }
};






// Obtener lista de colegios
exports.obtenerColegios = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT OrganizationId, Name 
            FROM Organization 
            WHERE RefOrganizationTypeId = 10  -- Asegura que este ID corresponde a colegios en tu BD
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("❌ Error al obtener colegios:", error);
        res.status(500).json({ error: "Error al obtener colegios." });
    }
};

// Obtener los cursos según el colegio seleccionado
exports.obtenerCursosPorColegio = async (req, res) => {
    const { colegioId } = req.params;

    if (!colegioId || isNaN(colegioId)) {
        return res.status(400).json({ message: "El ID del colegio es obligatorio y debe ser un número válido." });
    }

    try {
        const pool = await poolPromise;

        const query = `
           WITH RecursiveHierarchy AS (
    -- Paso inicial: Obtener la jerarquía desde el colegio
    SELECT 
        rel.OrganizationId, 
        rel.Parent_OrganizationId,
        org.Name,
        org.RefOrganizationTypeId
    FROM 
        OrganizationRelationship rel
    INNER JOIN 
        Organization org ON rel.OrganizationId = org.OrganizationId
    WHERE 
        rel.Parent_OrganizationId = @ColegioId

    UNION ALL

    -- Recorremos la jerarquía recursivamente
    SELECT 
        rel.OrganizationId, 
        rel.Parent_OrganizationId,
        org.Name,
        org.RefOrganizationTypeId
    FROM 
        OrganizationRelationship rel
    INNER JOIN 
        Organization org ON rel.OrganizationId = org.OrganizationId
    INNER JOIN 
        RecursiveHierarchy rh ON rel.Parent_OrganizationId = rh.OrganizationId
),
Grados AS (
    -- Obtener los grados dentro de la jerarquía del colegio
    SELECT 
        rel.OrganizationId AS GradoId,
        rel.Parent_OrganizationId AS CodigoEnsenanzaId,
        CAST(org.Name AS NVARCHAR(128)) AS GradoName
    FROM 
        OrganizationRelationship rel
    INNER JOIN 
        Organization org ON rel.OrganizationId = org.OrganizationId
    INNER JOIN 
        RefOrganizationType ref ON org.RefOrganizationTypeId = ref.RefOrganizationTypeId
    WHERE 
        rel.Parent_OrganizationId IN (SELECT OrganizationId FROM RecursiveHierarchy)
        AND ref.RefOrganizationElementTypeId = 46 -- Grados
),
Letras AS (
    -- Obtener las letras asociadas a los grados
    SELECT 
        rel.OrganizationId AS LetraId,
        rel.Parent_OrganizationId AS GradoId,
        CAST(org.Name AS NVARCHAR(128)) AS LetraName
    FROM 
        OrganizationRelationship rel
    INNER JOIN 
        Organization org ON rel.OrganizationId = org.OrganizationId
    INNER JOIN 
        RefOrganizationType ref ON org.RefOrganizationTypeId = ref.RefOrganizationTypeId
    WHERE 
        rel.Parent_OrganizationId IN (SELECT GradoId FROM Grados)
        AND ref.RefOrganizationElementTypeId = 21 -- Letras
)
-- Obtener los cursos con su OrganizationId
SELECT DISTINCT
    CONCAT(g.GradoName, ' - ', COALESCE(l.LetraName, '')) AS Curso,
    l.LetraId AS CursoOrganizationId, -- El ID del curso en sí
    g.GradoName, -- Incluir para ORDER BY
    l.LetraName  -- Incluir para ORDER BY
FROM 
    Grados g
LEFT JOIN 
    Letras l ON g.GradoId = l.GradoId
ORDER BY 
    g.GradoName, l.LetraName;

        `;

        const result = await pool.request()
            .input("ColegioId", sql.Int, colegioId)
            .query(query);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error al obtener los cursos:", error);
        res.status(500).json({ message: "Error al obtener los cursos.", error: error.message });
    }
};




exports.obtenerEventosPorCurso = async (req, res) => {
    const { cursoId } = req.params;

    if (!cursoId || isNaN(cursoId)) {
        return res.status(400).json({ message: "El ID del curso es obligatorio y debe ser un número válido." });
    }

    try {
        const pool = await poolPromise;

        /******************************************************
         * 1) OBTENER ID(s) de Calendario(s) para este curso
         ******************************************************/
        const calendarsResult = await pool.request()
            .input("CursoOrgId", sql.Int, cursoId)
            .query(`
                SELECT 
                    OrganizationCalendarId, 
                    OrganizationId, 
                    CalendarCode, 
                    CalendarDescription, 
                    CalendarYear
                FROM OrganizationCalendar
                WHERE OrganizationId = @CursoOrgId
            `);

        const listaCalendarios = calendarsResult.recordset;
        if (listaCalendarios.length === 0) {
            // No hay calendarios
            return res.status(200).json([]);
        }
        const calendarIds = listaCalendarios.map(c => c.OrganizationCalendarId);

        /******************************************************
         * 2) OBTENER las sesiones (OrganizationCalendarSession)
         ******************************************************/
        const sessionsResult = await pool.request().query(`
            SELECT 
                OrganizationCalendarSessionId,
                OrganizationCalendarId,
                BeginDate,
                EndDate,
                Code,
                Description,
                InstructionalMinutes
            FROM OrganizationCalendarSession
            WHERE OrganizationCalendarId IN (${calendarIds.join(',')})
        `);

        const listaSesiones = sessionsResult.recordset;

        // Determinar el rango [minBegin..maxEnd] de TODAS las sesiones

       		// Elegir la sesión con el rango menor (más corta)
		let sesionesValidas = listaSesiones.filter(sess => sess.BeginDate && sess.EndDate);

		// Ordenamos por fecha de inicio
		sesionesValidas = sesionesValidas.sort((a, b) => new Date(a.BeginDate) - new Date(b.BeginDate));

		// Usamos SOLO la primera sesión (la más antigua y probablemente actual)
		//sesionesValidas = [sesionesValidas[0]];


		if (sesionesValidas.length === 0) {
 		   return res.status(200).json([]); // No hay sesiones válidas
		}

		let minBegin = new Date(sesionesValidas[0].BeginDate);
		let maxEnd = new Date(sesionesValidas[0].EndDate);

		for (const sess of sesionesValidas) {
		    const bd = new Date(sess.BeginDate);
		    const ed = new Date(sess.EndDate);
		    if (bd < minBegin) minBegin = bd;
		    if (ed > maxEnd) maxEnd = ed;
		}


        if (!minBegin || !maxEnd) {
            // Si no hay fechas, devolvemos vacío o algo
            return res.status(200).json([]);
        }

        // Sacar todos los IDs de sesión
        const sessionIds = listaSesiones.map(s => s.OrganizationCalendarSessionId);

        /***************************************************************
         * 3) OBTENER CLASES (CourseSectionSchedule) con JOIN a:
         *    - Organization (para saber nombre asignatura)
         *    - OrganizationPersonRole + Person (para profesor)
         ***************************************************************/
        const clasesQuery = `
            SELECT 
                css.CourseSectionScheduleId,
                css.OrganizationId,   -- la "asignatura"
                css.ClassMeetingDays,
                CONVERT(VARCHAR(8), css.ClassBeginningTime, 108) AS ClassBeginningTime,
                CONVERT(VARCHAR(8), css.ClassEndingTime, 108)   AS ClassEndingTime,
                css.ClassPeriod,
                css.OrganizationCalendarSessionId,
				css.ContemplaAsistencia as IsAttendanceRequired,

                -- A: la asignatura
                A.OrganizationId AS AsignaturaId,   
                A.Name AS AsignaturaName,

                -- Profesor (si existe)
                P.PersonId AS ProfesorId,
                CONCAT(P.FirstName, ' ', P.LastName) AS ProfesorName
				
 

            FROM CourseSectionSchedule css

            -- Unir con la "asignatura"
            LEFT JOIN Organization A
                ON css.OrganizationId = A.OrganizationId

            -- Unir con la Persona/Profesor
            LEFT JOIN OrganizationPersonRole OPR
                ON A.OrganizationId = OPR.OrganizationId
                AND OPR.RoleId = 5  -- 5 = rol de profesor (ajusta si tu DB usa otro valor)

            LEFT JOIN Person P
                ON OPR.PersonId = P.PersonId

            WHERE css.OrganizationCalendarSessionId IN (${sessionIds.join(',')})
        `;
        const courseScheduleResult = await pool.request().query(clasesQuery);
        const schedulesClases = courseScheduleResult.recordset;

        /***************************************************************
         * 4) OBTENER RECREOS (RecessSchedule)
         *    Filtra por OrganizationId = curso, etc.
         ***************************************************************/
        const recessQuery = `
            SELECT 
                rs.RecessScheduleId,
                rs.OrganizationId,
                rs.ClassMeetingDays,
                CONVERT(VARCHAR(8), rs.RecessBeginningTime, 108) AS RecessBeginningTime,
                CONVERT(VARCHAR(8), rs.RecessEndingTime, 108)   AS RecessEndingTime,
                rs.ClassPeriod,
                rs.RecordStartDateTime,
                rs.RecordEndDateTime
            FROM RecessSchedule rs
            WHERE rs.OrganizationId = @CursoOrgId
        `;
        const recessResult = await pool.request()
            .input("CursoOrgId", sql.Int, cursoId)
            .query(recessQuery);

        const schedulesRecreos = recessResult.recordset;

        /************************************************************
         * 5) Para ir día a día en [minBegin..maxEnd], 
         *    checar qué clases/recreos tocan ese día.
         ************************************************************/
        const mapDiaSemana = {
            'Domingo': 0,
            'Lunes': 1,
            'Martes': 2,
            'Miércoles': 3,
            'Miercoles': 3,
            'Jueves': 4,
            'Viernes': 5,
            'Sábado': 6,
            'Sabado': 6
        };

        let eventos = [];

        // Función auxiliar: saber si un day entra en la [BeginDate..EndDate] de una session
        function dayBelongsToAnySession(day) {
            return listaSesiones.some(sess => {
                if (!sess.BeginDate || !sess.EndDate) return false;
                const b = new Date(sess.BeginDate);
                const e = new Date(sess.EndDate);
                return day >= b && day <= e;
            });
        }

        // Recorremos cada día
        for (let d = new Date(minBegin.getTime()); d <= maxEnd; d.setDate(d.getDate() + 1)) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()); // forzamos midnight (00:00:00)

    // ✅ validación definitiva contra el rango
    if (day < minBegin || day > maxEnd) continue;

    // ✅ validación por sesión exacta
    if (!dayBelongsToAnySession(day)) continue;


            const dayOfWeek = day.getDay();  // 0=Dom,1=Lun,...
            // Filtramos:
            //  (a) CLASES => must coincide dayOfWeek con sc.ClassMeetingDays
            //               y su sessionId esté en una session que cubra este day
            schedulesClases.forEach(sc => {
                if (!sc.ClassMeetingDays) return;
                const mapped = mapDiaSemana[sc.ClassMeetingDays.trim()] ?? -1;
                if (mapped !== dayOfWeek) return;

                // ¿Pertenece la fecha a la session de sc?
                // Buscamos la session con id = sc.OrganizationCalendarSessionId
                const sessionObj = listaSesiones.find(s => s.OrganizationCalendarSessionId === sc.OrganizationCalendarSessionId);
                if (!sessionObj) return;
                // Checar si day está dentro [BeginDate..EndDate]
                const b = new Date(sessionObj.BeginDate);
                const e = new Date(sessionObj.EndDate);
                if (day < b || day > e) return; // no cae en el rango de esa sesión

                if (!sc.ClassBeginningTime || !sc.ClassEndingTime) return;
                const [bH, bM] = sc.ClassBeginningTime.split(':');
                const [eH, eM] = sc.ClassEndingTime.split(':');

                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), bH, bM);
                const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eH, eM);

                // Armamos title + extras
                const bloque = sc.ClassPeriod || 'Bloque';
                const title = `${sc.ClassBeginningTime} Bloque de clases (${bloque})`;

                // Incluimos Asignatura/Profesor en “extended props” o directamente en el title
                const asignaturaStr = sc.AsignaturaName || 'Asignatura';
                const profeStr = sc.ProfesorName || '';
                // Ejemplo: en .title le agregamos un salto de línea:
                const fullTitle = `${title}\n${asignaturaStr}\nProf: ${profeStr}`;

                eventos.push({
                    start,
                    end,
                    title: fullTitle,    // lo que “Calendar” mostrará
                    asignatura: asignaturaStr,
                    profesor: profeStr,
                    asignaturaId: sc.AsignaturaId,
                    CourseSectionScheduleId: sc.CourseSectionScheduleId,
                    IsAttendanceRequired: sc.IsAttendanceRequired 					
                });
            });

            //  (b) RECREOS => se filtra día
            schedulesRecreos.forEach(sr => {
                if (!sr.ClassMeetingDays) return;
                const mapped = mapDiaSemana[sr.ClassMeetingDays.trim()] ?? -1;
                if (mapped !== dayOfWeek) return;

                // Opcional: ver si day >= sr.RecordStartDateTime y day <= sr.RecordEndDateTime
                if (sr.RecordStartDateTime && sr.RecordEndDateTime) {
                    const b = new Date(sr.RecordStartDateTime);
                    const e = new Date(sr.RecordEndDateTime);
                    if (day < b || day > e) return;
                } else {
                    // Podrías filtrar por las sessions, si procede
                    const entra = dayBelongsToAnySession(day);
                    if (!entra) return;
                }

                // Parsear hora
                if (!sr.RecessBeginningTime || !sr.RecessEndingTime) return;
                const [bH, bM] = sr.RecessBeginningTime.split(':');
                const [eH, eM] = sr.RecessEndingTime.split(':');

                const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), bH, bM);
                const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eH, eM);

                const bloque = sr.ClassPeriod || 'Recreo';
                const title = `${sr.RecessBeginningTime} Recreo de ${bloque}`;

                eventos.push({
                    start,
                    end,
                    title,
                    asignatura: 'Recreo',
                    profesor: ''
                });
            });
        }

        // Listo: enviamos
        return res.status(200).json(eventos);

    } catch (error) {
        console.error("Error al obtener eventos del curso:", error);
        return res.status(500).json({ 
            message: "Error al obtener los eventos.", 
            error: error.message 
        });
    }
};


exports.obtenerOAsPorAsignatura = async (req, res) => {
    const { asignaturaId } = req.params;

    if (!asignaturaId || isNaN(asignaturaId)) {
        return res.status(400).json({ error: 'El ID de la asignatura es obligatorio y debe ser un número.' });
    }

    try {
        const pool = await poolPromise;

        // 1. Obtener el RefOrganizationTypeId de la asignatura
        const orgResult = await pool.request()
            .input('asignaturaId', sql.Int, asignaturaId)
            .query(`
                SELECT RefOrganizationTypeId 
                FROM Organization 
                WHERE OrganizationId = @asignaturaId
            `);

        if (orgResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Asignatura no encontrada.' });
        }

        const tipoId = orgResult.recordset[0].RefOrganizationTypeId;

        // 2. Obtener los OA filtrados por RefOrganizationTypeId
        const oaResult = await pool.request()
            .input('tipoId', sql.Int, tipoId)
            .query(`
                SELECT 
                    LearningObjectiveId,
                    ObjectiveCode,
                    ObjectiveDescription
                FROM LearningObjective
                WHERE RefOrganizationTypeId = @tipoId
                ORDER BY LearningObjectiveId
            `);

        return res.status(200).json(oaResult.recordset);
    } catch (error) {
        console.error('Error al obtener OAs por tipo de asignatura:', error);
        return res.status(500).json({ error: 'Error al obtener objetivos de aprendizaje.' });
    }
};

exports.guardarOAsYActividadPorBloque = async (req, res) => {
  const {
    courseSectionScheduleId,
    objetivosAprendizaje,
    actividad,
    fecha,
    cursoId,
    usuarioId
  } = req.body;

  console.log("📥 Datos recibidos:");
  console.log("Schedule ID:", courseSectionScheduleId);
  console.log("Objetivos:", objetivosAprendizaje);
  console.log("Actividad:", actividad);
  console.log("Fecha:", fecha);
  console.log("Curso ID:", cursoId);
  console.log("Usuario ID:", usuarioId);

  // Validaciones
  if (
    !courseSectionScheduleId ||
    !Array.isArray(objetivosAprendizaje) ||
    objetivosAprendizaje.length === 0 ||
    !fecha ||
    !actividad
  ) {
    console.warn("⚠️ Datos incompletos en el request");
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const pool = await poolPromise;

    // 1. Insertar actividad
    console.log("📝 Insertando actividad...");
    const actividadResult = await pool.request()
      .input("CourseSectionScheduleId", sql.Int, courseSectionScheduleId)
      .input("CursoId", sql.Int, cursoId || null)
      .input("Fecha", sql.Date, new Date(fecha))
      .input("Actividad", sql.NVarChar(sql.MAX), actividad)
      .input("UsuarioId", sql.Int, usuarioId || null)
      .query(`
        INSERT INTO CourseSectionScheduleActivity (
          CourseSectionScheduleId,
          CursoId,
          Fecha,
          Actividad,
          UsuarioId
        )
        OUTPUT INSERTED.Id
        VALUES (
          @CourseSectionScheduleId,
          @CursoId,
          @Fecha,
          @Actividad,
          @UsuarioId
        )
      `);

    const actividadId = actividadResult.recordset[0].Id;
    console.log("✅ Actividad insertada con ID:", actividadId);

    // 2. Insertar cada OA vinculado
    for (const learningObjectiveId of objetivosAprendizaje) {
      console.log(`➡️ Insertando OA: ${learningObjectiveId}`);
      await pool.request()
        .input("CourseSectionScheduleId", sql.Int, courseSectionScheduleId)
        .input("LearningObjectiveId", sql.Int, learningObjectiveId)
        .input("Fecha", sql.Date, new Date(fecha))
        .input("CursoId", sql.Int, cursoId || null)
        .input("UsuarioId", sql.Int, usuarioId || null)
        .input("CourseSectionScheduleActivityId", sql.Int, actividadId)
        .query(`
          INSERT INTO CourseSectionScheduleObjective (
            CourseSectionScheduleId,
            LearningObjectiveId,
            Fecha,
            CursoId,
            UsuarioId,
            CourseSectionScheduleActivityId
          ) VALUES (
            @CourseSectionScheduleId,
            @LearningObjectiveId,
            @Fecha,
            @CursoId,
            @UsuarioId,
            @CourseSectionScheduleActivityId
          )
        `);
      console.log(`✅ OA ${learningObjectiveId} insertado correctamente.`);
    }

    console.log("🎉 Todos los OA y actividad fueron guardados.");
    res.status(200).json({ message: "Guardado correctamente." });

  } catch (err) {
    console.error("❌ Error al guardar OA y actividad:", err);
    res.status(500).json({ error: "Error al guardar OA y actividad." });
  }
};


exports.obtenerOAsYActividadPorBloque = async (req, res) => {
    const { scheduleId } = req.params;
    if (!scheduleId || isNaN(scheduleId)) {
        return res.status(400).json({ error: 'El ID del bloque es inválido.' });
    }

    try {
        const pool = await poolPromise;

        // 1. Obtener actividad desde CourseSectionScheduleActivity
        const actividadQuery = `
            SELECT Actividad 
            FROM CourseSectionScheduleActivity
            WHERE CourseSectionScheduleId = @scheduleId
        `;
        const actividadResult = await pool.request()
            .input('scheduleId', sql.Int, scheduleId)
            .query(actividadQuery);

        const actividadTexto = actividadResult.recordset[0]?.Actividad || "";

        // 2. Obtener OAs desde CourseSectionScheduleObjective
        const oaQuery = `
            SELECT 
                LO.LearningObjectiveId,
                LO.ObjectiveCode,
                LO.ObjectiveDescription
            FROM CourseSectionScheduleObjective CSO
            JOIN LearningObjective LO ON CSO.LearningObjectiveId = LO.LearningObjectiveId
            WHERE CSO.CourseSectionScheduleId = @scheduleId
        `;
        const oaResult = await pool.request()
            .input('scheduleId', sql.Int, scheduleId)
            .query(oaQuery);

        res.status(200).json({
            actividad: actividadTexto,
            objetivos: oaResult.recordset
        });

    } catch (error) {
        console.error("❌ Error al obtener OA y Actividad:", error);
        res.status(500).json({ error: 'Error al recuperar datos del bloque.' });
    }
};

exports.actualizarActividad = async (req, res) => {
  const { scheduleId, actividad } = req.body;

  if (!scheduleId || !actividad) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const pool = await poolPromise;

    await pool.request()
      .input("scheduleId", sql.Int, scheduleId)
      .input("actividad", sql.NVarChar(sql.MAX), actividad)
      .query(`
        UPDATE CourseSectionScheduleActivity
        SET Actividad = @actividad
        WHERE CourseSectionScheduleId = @scheduleId
      `);

    res.status(200).json({ message: "Actividad actualizada correctamente." });
  } catch (error) {
    console.error("❌ Error al actualizar actividad:", error);
    res.status(500).json({ error: "Error interno al actualizar." });
  }
};

// DELETE: Eliminar un OA vinculado a un bloque
exports.eliminarOADeBloque = async (req, res) => {
  const { scheduleId, learningObjectiveId } = req.params;

  try {
    const pool = await poolPromise; // <- esta es la corrección

    const result = await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .input('LearningObjectiveId', sql.Int, learningObjectiveId)
      .query(`
        DELETE FROM CourseSectionScheduleObjective
        WHERE CourseSectionScheduleId = @ScheduleId
          AND LearningObjectiveId = @LearningObjectiveId
      `);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'OA eliminado correctamente del bloque.' });
    } else {
      res.status(404).json({ message: 'No se encontró el OA para eliminar.' });
    }

  } catch (error) {
    console.error('❌ Error al eliminar OA del bloque:', error);
    res.status(500).json({ error: 'Error al eliminar OA del bloque.' });
  }
};

exports.obtenerEstudiantesPorCurso = async (req, res) => {
  const { cursoId } = req.params;

  if (!cursoId || isNaN(cursoId)) {
    return res.status(400).json({ error: "El ID del curso es inválido." });
  }

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input("cursoId", sql.Int, cursoId)
      .query(`
       WITH JerarquiaCurso AS (
  	SELECT Parent_OrganizationId AS CursoNivelId
  	FROM OrganizationRelationship
  	WHERE OrganizationId = @cursoId
	)
	SELECT 
  	opr.OrganizationPersonRoleId,
  	p.PersonId,
  	CONCAT(p.FirstName, ' ', ISNULL(p.MiddleName, ''), ' ', p.LastName, ' ', ISNULL(p.SecondLastName, '')) AS NombreCompleto
	FROM OrganizationPersonRole opr
	INNER JOIN Person p ON opr.PersonId = p.PersonId
	WHERE opr.OrganizationId IN (
  	SELECT CursoNivelId FROM JerarquiaCurso
  	UNION
  	SELECT @cursoId
	)
  	AND opr.RoleId = 6  -- estudiante
	ORDER BY p.LastName, p.FirstName;

      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("❌ Error al obtener estudiantes del curso:", error);
    res.status(500).json({ error: "Error al obtener los estudiantes." });
  }
};

exports.guardarAsistenciaPorBloque = async (req, res) => {
  const pool = await poolPromise;
  const { asistencia, fecha, scheduleId } = req.body;
  
	  // ✅ Validar si el bloque permite asistencia (IsAttendanceRequired = 1)
	const validarBloque = await pool.request()
	  .input('ScheduleId', sql.Int, scheduleId)
	  .query(`
		SELECT ContemplaAsistencia AS IsAttendanceRequired
		FROM CourseSectionSchedule 
		WHERE CourseSectionScheduleId = @ScheduleId
	  `);

	const habilitado = validarBloque.recordset[0]?.IsAttendanceRequired;

	if (!habilitado) {
	  return res.status(403).json({
		error: 'Este bloque no está habilitado para registrar asistencia. Para activarlo, ve a Gestión de Horarios y marca el bloque como válido para asistencia.'
	  });
	}

  
  

  if (!asistencia || !fecha || !scheduleId) {
    return res.status(400).json({ error: 'Faltan datos obligatorios.' });
  }

  let asistenciaArray;
  try {
    asistenciaArray = JSON.parse(asistencia);
  } catch (err) {
    return res.status(400).json({ error: 'El campo asistencia no es JSON válido.' });
  }

  const archivos = req.files || [];

  try {
    for (const alumno of asistenciaArray) {
      const {
        OrganizationPersonRoleId,
        RefAttendanceStatusId,
        RefAttendanceEventTypeId = 2,
        RefAbsentAttendanceCategoryId = null,
        RefPresentAttendanceCategoryId = null,
        RefLeaveEventTypeId = null,
        WithdrawalResponsible = null,
        Notes = null,
        _clearFile = false
      } = alumno;

      const archivoAlumno = archivos.find(f => f.fieldname === `justificativo_${OrganizationPersonRoleId}`);
	  let JustificationFileUrl = (_clearFile || !archivoAlumno) ? null : archivoAlumno.filename;

		// ✅ Si se marcó _clearFile y multer subió un archivo, eliminarlo del disco para evitar basura
		if (_clearFile && archivoAlumno?.filename) {
		  const pathNuevoArchivo = path.join(__dirname, '../../uploads/justificativos', archivoAlumno.filename);
		  if (fs.existsSync(pathNuevoArchivo)) {
			fs.unlinkSync(pathNuevoArchivo);
			console.log(`🗑️ Archivo subido innecesariamente también eliminado: ${archivoAlumno.filename}`);
		  }
		}


      // Verificar si ya existe un registro para este estudiante y fecha
      const result = await pool.request()
        .input('OrganizationPersonRoleId', sql.Int, OrganizationPersonRoleId)
        .input('Date', sql.Date, new Date(fecha))
        .input('RefAttendanceEventTypeId', sql.Int, RefAttendanceEventTypeId)
        .query(`
          SELECT JustificationFileUrl FROM RoleAttendanceEvent
          WHERE OrganizationPersonRoleId = @OrganizationPersonRoleId
            AND Date = @Date
            AND RefAttendanceEventTypeId = @RefAttendanceEventTypeId
        `);

      const existe = result.recordset.length > 0;
      const archivoAnterior = result.recordset[0]?.JustificationFileUrl;

      // ✅ Eliminar archivo anterior si el nuevo estado es "Presente"
      if (existe && RefAttendanceStatusId === 1 && archivoAnterior) {
        const filePath = path.join(__dirname, '../../uploads/justificativos', archivoAnterior);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo eliminado: ${filePath}`);
        } else {
          console.log(`⚠️ Archivo no encontrado: ${filePath}`);
        }
      }

      if (existe) {
        // Hacer UPDATE
        await pool.request()
          .input('OrganizationPersonRoleId', sql.Int, OrganizationPersonRoleId)
          .input('Date', sql.Date, new Date(fecha))
          .input('RefAttendanceEventTypeId', sql.Int, RefAttendanceEventTypeId)
          .input('RefAttendanceStatusId', sql.Int, RefAttendanceStatusId)
          .input('RefAbsentAttendanceCategoryId', sql.Int, RefAbsentAttendanceCategoryId)
          .input('RefPresentAttendanceCategoryId', sql.Int, RefPresentAttendanceCategoryId)
          .input('RefLeaveEventTypeId', sql.Int, RefLeaveEventTypeId)
          .input('Notes', sql.NVarChar(sql.MAX), RefAttendanceStatusId === 1 ? null : Notes)
          .input('WithdrawalResponsible', sql.NVarChar(50), RefAttendanceStatusId === 1 ? null : WithdrawalResponsible)
          .input('JustificationFileUrl', sql.NVarChar(500), JustificationFileUrl)
          .query(`
            UPDATE RoleAttendanceEvent
            SET 
              RefAttendanceStatusId = @RefAttendanceStatusId,
              RefAbsentAttendanceCategoryId = @RefAbsentAttendanceCategoryId,
              RefPresentAttendanceCategoryId = @RefPresentAttendanceCategoryId,
              RefLeaveEventTypeId = @RefLeaveEventTypeId,
              Notes = @Notes,
              WithdrawalResponsible = @WithdrawalResponsible,
              JustificationFileUrl = @JustificationFileUrl
            WHERE OrganizationPersonRoleId = @OrganizationPersonRoleId
              AND Date = @Date
              AND RefAttendanceEventTypeId = @RefAttendanceEventTypeId
          `);
      } else {
        // Hacer INSERT
        await pool.request()
          .input('OrganizationPersonRoleId', sql.Int, OrganizationPersonRoleId)
          .input('Date', sql.Date, new Date(fecha))
          .input('RefAttendanceEventTypeId', sql.Int, RefAttendanceEventTypeId)
          .input('RefAttendanceStatusId', sql.Int, RefAttendanceStatusId)
          .input('RefAbsentAttendanceCategoryId', sql.Int, RefAbsentAttendanceCategoryId)
          .input('RefPresentAttendanceCategoryId', sql.Int, RefPresentAttendanceCategoryId)
          .input('RefLeaveEventTypeId', sql.Int, RefLeaveEventTypeId)
          .input('Notes', sql.NVarChar(sql.MAX), RefAttendanceStatusId === 1 ? null : Notes)
          .input('WithdrawalResponsible', sql.NVarChar(50), RefAttendanceStatusId === 1 ? null : WithdrawalResponsible)
          .input('JustificationFileUrl', sql.NVarChar(500), JustificationFileUrl)
          .query(`
            INSERT INTO RoleAttendanceEvent (
              OrganizationPersonRoleId,
              Date,
              RefAttendanceEventTypeId,
              RefAttendanceStatusId,
              RefAbsentAttendanceCategoryId,
              RefPresentAttendanceCategoryId,
              RefLeaveEventTypeId,
              Notes,
              WithdrawalResponsible,
              JustificationFileUrl
            )
            VALUES (
              @OrganizationPersonRoleId,
              @Date,
              @RefAttendanceEventTypeId,
              @RefAttendanceStatusId,
              @RefAbsentAttendanceCategoryId,
              @RefPresentAttendanceCategoryId,
              @RefLeaveEventTypeId,
              @Notes,
              @WithdrawalResponsible,
              @JustificationFileUrl
            )
          `);
      }
    }

    return res.status(200).json({ message: '✅ Asistencia registrada correctamente.' });
  } catch (err) {
    console.error("❌ Error al guardar asistencia:", err);
    return res.status(500).json({ error: 'Error interno al guardar asistencia.' });
  }
};



exports.obtenerAsistenciaPorBloque = async (req, res) => {
  const { scheduleId, fecha } = req.query;

  if (!scheduleId || !fecha) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    const pool = await poolPromise;

    // Primero obtenemos el curso (OrganizationId) asociado al bloque
    const cursoResult = await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .query(`
        SELECT OrgRel.Parent_OrganizationId AS CursoId
        FROM CourseSectionSchedule css
        INNER JOIN OrganizationRelationship OrgRel ON css.OrganizationId = OrgRel.OrganizationId
        WHERE css.CourseSectionScheduleId = @ScheduleId
      `);

    if (cursoResult.recordset.length === 0) {
      return res.status(404).json({ error: 'No se encontró el curso para el bloque.' });
    }

    const cursoId = cursoResult.recordset[0].CursoId;

    // Ahora traemos la asistencia por esa fecha y curso
    const result = await pool.request()
      .input('CursoId', sql.Int, cursoId)
      .input('Fecha', sql.Date, fecha)
      .query(`
        SELECT 
          rae.OrganizationPersonRoleId,
          rae.RefAttendanceStatusId,
          rae.Notes,
          rae.JustificationFileUrl,
          rae.WithdrawalResponsible
        FROM RoleAttendanceEvent rae
        INNER JOIN OrganizationPersonRole opr ON rae.OrganizationPersonRoleId = opr.OrganizationPersonRoleId
        WHERE opr.OrganizationId = @CursoId
          AND rae.Date = @Fecha
          AND rae.RefAttendanceEventTypeId = 2
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("❌ Error al obtener asistencia:", err);
    res.status(500).json({ error: 'Error interno al consultar asistencia.' });
  }
};




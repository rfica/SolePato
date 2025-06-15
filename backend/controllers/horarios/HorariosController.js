// HorariosController.js
const sql = require('mssql');
const { poolPromise } = require('../../config/db');

exports.saveBulkHorarios = async (req, res) => {
  const { calendarData, horarios } = req.body;

  console.log("📌 Datos recibidos en saveBulkHorarios:", JSON.stringify(req.body, null, 2));

  if (!calendarData || !calendarData.organizationId || !horarios || !Array.isArray(horarios)) {
    return res.status(400).json({ message: 'Datos inválidos. Verifique el formato enviado.' });
  }

  try {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const yearFromFechaInicio = new Date(calendarData.sessions[0].beginDate).getFullYear();

    let calendarResult = await transaction.request()
      .input('OrganizationId', sql.Int, calendarData.organizationId)
      .input('CalendarYear', sql.Int, yearFromFechaInicio)
      .query(`
        SELECT TOP 1 OrganizationCalendarId 
        FROM OrganizationCalendar 
        WHERE OrganizationId = @OrganizationId AND CalendarYear = @CalendarYear
      `);

    let organizationCalendarId;

    if (calendarResult.recordset.length > 0) {
      organizationCalendarId = calendarResult.recordset[0].OrganizationCalendarId;
    } else {
      const insertCalendar = await transaction.request()
        .input('OrganizationId', sql.Int, calendarData.organizationId)
        .input('CalendarCode', sql.NVarChar, calendarData.calendarCode)
        .input('CalendarDescription', sql.NVarChar, calendarData.calendarDescription)
        .input('CalendarYear', sql.Int, yearFromFechaInicio)
        .query(`
          INSERT INTO OrganizationCalendar (
            OrganizationId, CalendarCode, CalendarDescription, CalendarYear
          ) OUTPUT inserted.OrganizationCalendarId
          VALUES (
            @OrganizationId, @CalendarCode, @CalendarDescription, @CalendarYear
          );
        `);
      organizationCalendarId = insertCalendar.recordset[0].OrganizationCalendarId;
    }

			let sessionResult = await transaction.request()
		  .input('OrganizationId', sql.Int, calendarData.organizationId)
		  .input('BeginDate', sql.Date, calendarData.sessions[0].beginDate)
		  .input('EndDate', sql.Date, calendarData.sessions[0].endDate)
		  .query(`
			SELECT OCS.OrganizationCalendarSessionId, OCS.BeginDate, OCS.EndDate
			FROM OrganizationCalendarSession OCS
			INNER JOIN OrganizationCalendar OC ON OC.OrganizationCalendarId = OCS.OrganizationCalendarId
			WHERE OC.OrganizationId = @OrganizationId
			  AND (
				(@BeginDate BETWEEN OCS.BeginDate AND OCS.EndDate)
				OR (@EndDate BETWEEN OCS.BeginDate AND OCS.EndDate)
				OR (OCS.BeginDate BETWEEN @BeginDate AND @EndDate)
				OR (OCS.EndDate BETWEEN @BeginDate AND @EndDate)
			  )
		  `);


    let organizationCalendarSessionId;

		 const sesionExistente = sessionResult.recordset.find(s => {
		  const beginIgual = new Date(s.BeginDate).toISOString().split("T")[0] === calendarData.sessions[0].beginDate;
		  const endIgual = new Date(s.EndDate).toISOString().split("T")[0] === calendarData.sessions[0].endDate;
		  return beginIgual && endIgual;
		});

		if (sesionExistente) {
		  return res.status(400).json({
			message: `⛔ Ya existe una sesión con fechas exactamente iguales (${calendarData.sessions[0].beginDate} al ${calendarData.sessions[0].endDate}). No se puede duplicar.`,
			codigo: "SOLAPAMIENTO_IDEM"
		  });
		}


    if (sesionExistente) {
      organizationCalendarSessionId = sesionExistente.OrganizationCalendarSessionId;
    } else if (sessionResult.recordset.length > 0) {
      return res.status(400).json({
        message: `Ya existe una sesión entre ${sessionResult.recordset[0].BeginDate.toISOString().split("T")[0]} y ${sessionResult.recordset[0].EndDate.toISOString().split("T")[0]} que se solapa con el nuevo rango.`,
        codigo: "SOLAPAMIENTO_SESION"
      });
    } else {
      const insertSession = await transaction.request()
        .input('OrganizationCalendarId', sql.Int, organizationCalendarId)
        .input('BeginDate', sql.Date, calendarData.sessions[0].beginDate)
        .input('EndDate', sql.Date, calendarData.sessions[0].endDate)
        .input('Description', sql.NVarChar, calendarData.sessions[0].description)
        .query(`
          INSERT INTO OrganizationCalendarSession (
            OrganizationCalendarId, BeginDate, EndDate, Description
          ) OUTPUT inserted.OrganizationCalendarSessionId
          VALUES (
            @OrganizationCalendarId, @BeginDate, @EndDate, @Description
          );
        `);
      organizationCalendarSessionId = insertSession.recordset[0].OrganizationCalendarSessionId;
    }

   if (!organizationCalendarSessionId) {
		  await transaction.rollback();
		  return res.status(400).json({
			error: "No se pudo crear la sesión del calendario. Verifique que no haya conflictos de fechas.",
			codigo: "FALLO_INSERCION_SESION"
		  });
		}


    // Procesar bloques
    for (const bloque of horarios) {
      const { classMeetingDays, classBeginningTime, classEndingTime, classPeriod, organizationId, profesor, tipoBloque, asistencia } = bloque;

      if (!tipoBloque) continue;

			   if (tipoBloque?.toLowerCase().trim() === "recreo") {
			  // Validación basada en día + hora + sesión (criterio del usuario)
			  const yaExisteRecreo = await transaction.request()
				.input("OrganizationId", sql.Int, calendarData.organizationId)
				.input("ClassMeetingDays", sql.NVarChar, classMeetingDays)
				.input("RecessBeginningTime", sql.VarChar, classBeginningTime)
				.input("RecessEndingTime", sql.VarChar, classEndingTime)
				.input("RecordStartDateTime", sql.DateTime, calendarData.sessions[0].beginDate)
				.input("RecordEndDateTime", sql.DateTime, calendarData.sessions[0].endDate)
				.query(`
				  SELECT TOP 1 RecessScheduleId FROM RecessSchedule
				  WHERE OrganizationId = @OrganizationId
					AND ClassMeetingDays = @ClassMeetingDays
					AND RecessBeginningTime = @RecessBeginningTime
					AND RecessEndingTime = @RecessEndingTime
					AND @RecordStartDateTime BETWEEN RecordStartDateTime AND RecordEndDateTime
					AND @RecordEndDateTime BETWEEN RecordStartDateTime AND RecordEndDateTime

				`);

			  if (yaExisteRecreo.recordset.length > 0) {
				console.log("⚠️ Ya existe recreo en ese horario. Se omite.");
				bloque.scheduleId = yaExisteRecreo.recordset[0].RecessScheduleId;
				continue;
			  }

			  // Insertar recreo si no existe
			  const insertResult = await transaction.request()
				.input("OrganizationId", sql.Int, calendarData.organizationId)
				.input("ClassMeetingDays", sql.NVarChar, classMeetingDays)
				.input("RecessBeginningTime", sql.VarChar, classBeginningTime)
				.input("RecessEndingTime", sql.VarChar, classEndingTime)
				.input("ClassPeriod", sql.NVarChar, classPeriod)
				.input("RecordStartDateTime", sql.DateTime, calendarData.sessions[0].beginDate)
				.input("RecordEndDateTime", sql.DateTime, calendarData.sessions[0].endDate)
				.query(`
				  INSERT INTO RecessSchedule (
					OrganizationId, ClassMeetingDays, RecessBeginningTime, RecessEndingTime, 
					ClassPeriod, RecordStartDateTime, RecordEndDateTime
				  ) OUTPUT inserted.RecessScheduleId
				  VALUES (
					@OrganizationId, @ClassMeetingDays, @RecessBeginningTime, @RecessEndingTime, 
					@ClassPeriod, @RecordStartDateTime, @RecordEndDateTime
				  );
				`);

			  bloque.scheduleId = insertResult.recordset[0].RecessScheduleId;
			  continue;
			}


     if (tipoBloque?.toLowerCase().trim().startsWith("clase")) {
		   /* 
			  // 🛑 Si el bloque ya tiene ID, asumimos que ya está en BD y lo ignoramos
			  if (bloque.scheduleId && Number(bloque.scheduleId) > 0) {
				console.log("⏩ Clase ya existente, se omite:", bloque.scheduleId);
				continue;
			  }
             */ 

			  // 🔎 Comprobamos si ya existe exactamente el mismo bloque (por seguridad)
			 // Revisión más estricta: solo omite si TODO es igual
				const yaExiste = await transaction.request()
				  .input("OrganizationCalendarSessionId", sql.Int, organizationCalendarSessionId)
				  .input("ClassMeetingDays", sql.NVarChar, classMeetingDays)
				  .input("ClassBeginningTime", sql.VarChar, classBeginningTime)
				  .input("ClassEndingTime", sql.VarChar, classEndingTime)
				  .input("ClassPeriod", sql.NVarChar, classPeriod)
				  .input("OrganizationId", sql.Int, organizationId)
				  .query(`
					SELECT CourseSectionScheduleId FROM CourseSectionSchedule
					WHERE OrganizationCalendarSessionId = @OrganizationCalendarSessionId
					  AND ClassMeetingDays = @ClassMeetingDays
					  AND ClassBeginningTime = @ClassBeginningTime
					  AND ClassEndingTime = @ClassEndingTime
					  AND ClassPeriod = @ClassPeriod
					  AND OrganizationId = @OrganizationId;
				  `);


			 if (yaExiste.recordset.length > 0) {
			  const scheduleIdExistente = yaExiste.recordset[0].CourseSectionScheduleId;
			  console.log("🔁 Ya existe bloque, actualizando profesor y asistencia:", scheduleIdExistente);

			  await transaction.request()
				.input("ScheduleId", sql.Int, scheduleIdExistente)
				.input("ContemplaAsistencia", sql.Bit, asistencia === true)
				.query(`
				  UPDATE CourseSectionSchedule
				  SET ContemplaAsistencia = @ContemplaAsistencia
				  WHERE CourseSectionScheduleId = @ScheduleId
				`);

			  bloque.scheduleId = scheduleIdExistente;
			  continue;
			}


			  const insertResult = await transaction.request()
				.input("OrganizationId", sql.Int, organizationId)
				.input("ClassMeetingDays", sql.NVarChar, classMeetingDays)
				.input("ClassBeginningTime", sql.VarChar, classBeginningTime)
				.input("ClassEndingTime", sql.VarChar, classEndingTime)
				.input("ClassPeriod", sql.NVarChar, classPeriod)
				.input("OrganizationCalendarSessionId", sql.Int, organizationCalendarSessionId)
				.input("ContemplaAsistencia", sql.Bit, asistencia === true)
				.query(`
				  INSERT INTO CourseSectionSchedule (
					OrganizationId, ClassMeetingDays, ClassBeginningTime, ClassEndingTime, 
					ClassPeriod, OrganizationCalendarSessionId, ContemplaAsistencia
				  ) OUTPUT inserted.CourseSectionScheduleId
				  VALUES (
					@OrganizationId, @ClassMeetingDays, @ClassBeginningTime, @ClassEndingTime, 
					@ClassPeriod, @OrganizationCalendarSessionId, @ContemplaAsistencia
				  );
				`);

			  bloque.scheduleId = insertResult.recordset[0].CourseSectionScheduleId;
			}

    }

		   // Verifica si algún horario fue efectivamente insertado o actualizado
		const totalInsertados = horarios.filter(h => h.scheduleId).length;

		if (totalInsertados === 0) {
		  await transaction.rollback();
		  return res.status(400).json({
			message: '⚠️ No se insertaron horarios ni recreos. Es posible que ya existieran o que no haya datos válidos.',
			codigo: 'NINGUN_BLOQUE_INSERTADO'
		  });
		}

		await transaction.commit();
		res.status(201).json({
		  message: 'Horarios y recreos guardados correctamente.',
		  bloquesConId: horarios
		});

	
	
	
  } catch (error) {
    console.error("❌ Error al guardar horarios en lote:", error);
    res.status(500).json({ message: 'Error al guardar horarios en lote.', error: error.message });
  }
};


const formatearHoraSQL = (hora) => {
  if (!hora || typeof hora !== "string" || !hora.includes(":")) return "00:00:00";
  const partes = hora.split(":");
  if (partes.length === 2) {
    const [hh, mm] = partes.map(p => p.padStart(2, "0"));
    return `${hh}:${mm}:00`;
  }
  if (partes.length === 3) {
    const [hh, mm, ss] = partes.map(p => p.padStart(2, "0"));
    return `${hh}:${mm}:${ss}`;
  }
  return "00:00:00";
};



exports.actualizarBloquesCalendario = async (req, res) => {
  const { calendarSessionId, cursoId, nuevos, modificados } = req.body;

  try {
    const pool = await poolPromise;

    const calendarioResult = await pool
      .request()
      .input("sessionId", sql.Int, calendarSessionId)
      .query(`
        SELECT BeginDate, EndDate
        FROM OrganizationCalendarSession
        WHERE OrganizationCalendarSessionId = @sessionId
      `);

    const { BeginDate: beginDate, EndDate: endDate } = calendarioResult.recordset[0];

    const formatearHoraSQL = (hora) => {
      if (!hora || typeof hora !== "string" || !hora.includes(":")) return "00:00:00";
      const partes = hora.split(":");
      if (partes.length === 2) {
        const [hh, mm] = partes.map(p => p.padStart(2, "0"));
        return `${hh}:${mm}:00`;
      }
      if (partes.length === 3) {
        const [hh, mm, ss] = partes.map(p => p.padStart(2, "0"));
        return `${hh}:${mm}:${ss}`;
      }
      return "00:00:00";
    };

    const bloquesConId = [];

    // Agrupar por día para calcular el índice local
    const nuevosPorDia = {};
    for (const bloque of nuevos) {
      if (!nuevosPorDia[bloque.ClassMeetingDays]) nuevosPorDia[bloque.ClassMeetingDays] = [];
      nuevosPorDia[bloque.ClassMeetingDays].push(bloque);
    }

    for (const dia of Object.keys(nuevosPorDia)) {
      const bloquesDelDia = nuevosPorDia[dia];

      for (let idx = 0; idx < bloquesDelDia.length; idx++) {
        const bloque = bloquesDelDia[idx];
        const esRecreo = !bloque.RefSubjectId && !bloque.OrganizationPersonRoleId;
        const horaInicioSQL = formatearHoraSQL(bloque.ClassBeginningTime);
        const horaFinSQL = formatearHoraSQL(bloque.ClassEndingTime);
        const classPeriod = bloque.ClassPeriod || `Bloque ${idx + 1}`;

        if (esRecreo) {
          const insertResult = await pool.request()
            .input("OrganizationId", sql.Int, cursoId)
            .input("ClassMeetingDays", sql.NVarChar(50), bloque.ClassMeetingDays)
            .input("RecessBeginningTime", sql.VarChar, horaInicioSQL)
            .input("RecessEndingTime", sql.VarChar, horaFinSQL)
            .input("ClassPeriod", sql.NVarChar(50), classPeriod)
            .input("RecordStartDateTime", sql.DateTime, beginDate)
            .input("RecordEndDateTime", sql.DateTime, endDate)
            .query(`
              INSERT INTO RecessSchedule (
                OrganizationId, ClassMeetingDays, RecessBeginningTime, RecessEndingTime,
                ClassPeriod, RecordStartDateTime, RecordEndDateTime
              ) OUTPUT inserted.RecessScheduleId
              VALUES (
                @OrganizationId, @ClassMeetingDays, @RecessBeginningTime, @RecessEndingTime,
                @ClassPeriod, @RecordStartDateTime, @RecordEndDateTime
              )
            `);

          bloquesConId.push({
            scheduleId: insertResult.recordset[0].RecessScheduleId,
            classMeetingDays: bloque.ClassMeetingDays,
            classBeginningTime: bloque.ClassBeginningTime,
            classEndingTime: bloque.ClassEndingTime,
            classPeriod,
            tipoBloque: "recreo"
          });
        } else {
			
			
			
			
			
          const insertResult = await pool.request()
			  .input("OrganizationId", sql.Int, bloque.RefSubjectId)
			  .input("ClassMeetingDays", sql.NVarChar(50), bloque.ClassMeetingDays)
			  .input("ClassBeginningTime", sql.VarChar, horaInicioSQL)
			  .input("ClassEndingTime", sql.VarChar, horaFinSQL)
			  .input("ClassPeriod", sql.NVarChar(50), classPeriod)
			  .input("ContemplaAsistencia", sql.Bit, bloque.ContemplaAsistencia)
			  .input("OrganizationCalendarSessionId", sql.Int, calendarSessionId)
			  .query(`
				INSERT INTO CourseSectionSchedule (
				  OrganizationId,
				  ClassMeetingDays,
				  ClassBeginningTime,
				  ClassEndingTime,
				  ClassPeriod,
				  ContemplaAsistencia,
				  OrganizationCalendarSessionId
				)
				OUTPUT inserted.CourseSectionScheduleId
				VALUES (
				  @OrganizationId,
				  @ClassMeetingDays,
				  @ClassBeginningTime,
				  @ClassEndingTime,
				  @ClassPeriod,
				  @ContemplaAsistencia,
				  @OrganizationCalendarSessionId
				)
			  `);


          bloquesConId.push({
            scheduleId: insertResult.recordset[0].CourseSectionScheduleId,
            classMeetingDays: bloque.ClassMeetingDays,
            classBeginningTime: bloque.ClassBeginningTime,
            classEndingTime: bloque.ClassEndingTime,
            classPeriod,
            tipoBloque: "clase"
          });
        }
      }
    }
	
	
	 // NUEVO: actualiza bloques modificados (cambio profesor/asignatura)
    for (const bloque of modificados || []) {
      const esRecreo = !bloque.RefSubjectId && !bloque.OrganizationPersonRoleId;

      if (!esRecreo) {
        const horaInicioSQL = formatearHoraSQL(bloque.ClassBeginningTime);
        const horaFinSQL = formatearHoraSQL(bloque.ClassEndingTime);

        await pool.request()
          .input("ScheduleId", sql.Int, bloque.scheduleId)
          .input("ClassMeetingDays", sql.NVarChar, bloque.ClassMeetingDays)
          .input("ClassBeginningTime", sql.VarChar, horaInicioSQL)
          .input("ClassEndingTime", sql.VarChar, horaFinSQL)
          .input("OrganizationId", sql.Int, bloque.RefSubjectId)
         // .input("OrganizationPersonRoleId", sql.Int, bloque.OrganizationPersonRoleId)
          .input("ContemplaAsistencia", sql.Bit, bloque.ContemplaAsistencia)
          .query(`
            UPDATE CourseSectionSchedule
            SET ClassMeetingDays = @ClassMeetingDays,
                ClassBeginningTime = @ClassBeginningTime,
                ClassEndingTime = @ClassEndingTime,
                OrganizationId = @OrganizationId,            
                ContemplaAsistencia = @ContemplaAsistencia
            WHERE CourseSectionScheduleId = @ScheduleId
          `);
      }
    }
	
	
	

    res.status(200).json({
      message: "Bloques actualizados correctamente",
      bloquesConId
    });
  } catch (error) {
    console.error("Error al actualizar bloques del calendario:", error);
    res.status(500).json({ error: "Error al actualizar bloques del calendario." });
  }
};






// Función para replicar horarios de un año anterior
exports.replicarHorarios = async (req, res) => {
    const { cursoId, anioAnterior, anioNuevo } = req.body;

    console.log('Datos recibidos para replicar horarios:', { cursoId, anioAnterior, anioNuevo });

    // Validación inicial de los datos
    if (!cursoId || !anioAnterior || !anioNuevo) {
        return res.status(400).json({ message: 'El ID del curso, el año anterior y el año nuevo son obligatorios.' });
    }

    try {
        const pool = await poolPromise;

        // Validar que el año anterior existe en la base de datos
        const calendarioAnterior = await pool.request()
            .input('cursoId', sql.Int, cursoId)
            .input('anioAnterior', sql.Int, anioAnterior)
            .query(`
                SELECT OrganizationCalendarId 
                FROM OrganizationCalendar
                WHERE OrganizationId = @cursoId AND CalendarYear = @anioAnterior;
            `);

        if (calendarioAnterior.recordset.length === 0) {
            return res.status(404).json({ message: 'El calendario del año anterior no existe.' });
        }

        const calendarioAnteriorId = calendarioAnterior.recordset[0].OrganizationCalendarId;

        // Validar que no hay conflictos en el nuevo año
        const calendarioConflictos = await pool.request()
            .input('cursoId', sql.Int, cursoId)
            .input('anioNuevo', sql.Int, anioNuevo)
            .query(`
                SELECT 1
                FROM OrganizationCalendar
                WHERE OrganizationId = @cursoId AND CalendarYear = @anioNuevo;
            `);

        if (calendarioConflictos.recordset.length > 0) {
            return res.status(400).json({ message: 'Ya existe un calendario para el año nuevo. No se puede replicar.' });
        }

        // Crear el nuevo calendario para el año nuevo
        const nuevoCalendario = await pool.request()
            .input('cursoId', sql.Int, cursoId)
            .input('anioNuevo', sql.Int, anioNuevo)
            .query(`
                INSERT INTO OrganizationCalendar (OrganizationId, CalendarCode, CalendarDescription, CalendarYear)
                OUTPUT INSERTED.OrganizationCalendarId
                VALUES (
                    @cursoId,
                    CONCAT(@anioNuevo, '-', 'Calendario Replicado'),
                    'Calendario replicado del año anterior',
                    @anioNuevo
                );
            `);

        const nuevoCalendarioId = nuevoCalendario.recordset[0].OrganizationCalendarId;

        // Replicar los subrangos del año anterior al nuevo calendario
        const subrangos = await pool.request()
            .input('calendarioAnteriorId', sql.Int, calendarioAnteriorId)
            .query(`
                SELECT BeginDate, EndDate, Description
                FROM OrganizationCalendarSession
                WHERE OrganizationCalendarId = @calendarioAnteriorId;
            `);

        for (const subrango of subrangos.recordset) {
            await pool.request()
                .input('nuevoCalendarioId', sql.Int, nuevoCalendarioId)
                .input('BeginDate', sql.Date, subrango.BeginDate)
                .input('EndDate', sql.Date, subrango.EndDate)
                .input('Description', sql.NVarChar, subrango.Description)
                .query(`
                    INSERT INTO OrganizationCalendarSession (OrganizationCalendarId, BeginDate, EndDate, Description)
                    VALUES (@nuevoCalendarioId, @BeginDate, @EndDate, @Description);
                `);
        }

        // Replicar los horarios del año anterior al nuevo calendario
        const horarios = await pool.request()
            .input('cursoId', sql.Int, cursoId)
            .input('calendarioAnteriorId', sql.Int, calendarioAnteriorId)
            .query(`
                SELECT ClassMeetingDays, ClassBeginningTime, ClassEndingTime, RecordStartDateTime, RecordEndDateTime
                FROM CourseSectionSchedule
                WHERE OrganizationId = @cursoId AND RecordStartDateTime >= (
                    SELECT MIN(BeginDate) FROM OrganizationCalendarSession WHERE OrganizationCalendarId = @calendarioAnteriorId
                ) AND RecordEndDateTime <= (
                    SELECT MAX(EndDate) FROM OrganizationCalendarSession WHERE OrganizationCalendarId = @calendarioAnteriorId
                );
            `);

        for (const horario of horarios.recordset) {
            await pool.request()
                .input('cursoId', sql.Int, cursoId)
                .input('ClassMeetingDays', sql.NVarChar, horario.ClassMeetingDays)
                .input('ClassBeginningTime', sql.Time, horario.ClassBeginningTime)
                .input('ClassEndingTime', sql.Time, horario.ClassEndingTime)
                .input('RecordStartDateTime', sql.DateTime, horario.RecordStartDateTime)
                .input('RecordEndDateTime', sql.DateTime, horario.RecordEndDateTime)
                .query(`
                    INSERT INTO CourseSectionSchedule (OrganizationId, ClassMeetingDays, ClassBeginningTime, ClassEndingTime, RecordStartDateTime, RecordEndDateTime)
                    VALUES (@cursoId, @ClassMeetingDays, @ClassBeginningTime, @ClassEndingTime, @RecordStartDateTime, @RecordEndDateTime);
                `);
        }

        res.status(201).json({ message: 'Horarios replicados correctamente.', nuevoCalendarioId });
    } catch (error) {
        console.error('Error al replicar horarios:', error);
        res.status(500).json({ message: 'Error al replicar horarios.', error: error.message });
    }
};





// Guardar un evento excepcional en el calendario
exports.saveCalendarEvent = async (req, res) => {
    const { organizationId, eventName, eventDate, eventType, eventDescription } = req.body;

    if (!organizationId || !eventName || !eventDate || !eventType) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('OrganizationId', sql.Int, organizationId)
            .input('Name', sql.NVarChar, eventName)
            .input('EventDate', sql.Date, eventDate)
            .input('RefCalendarEventType', sql.Int, eventType)
            .input('EventDescription', sql.NVarChar, eventDescription || '')
            .query(`
                INSERT INTO OrganizationCalendarEvent (OrganizationId, Name, EventDate, RefCalendarEventType, EventDescription)
                VALUES (@OrganizationId, @Name, @EventDate, @RefCalendarEventType, @EventDescription);
            `);

        res.status(201).json({ message: 'Evento registrado correctamente.' });
    } catch (error) {
        console.error('Error al guardar el evento:', error);
        res.status(500).json({ message: 'Error al guardar el evento.', error: error.message });
    }
};


// Obtener horarios por curso y sesión de calendario seleccionada
exports.getHorariosByCourse = async (req, res) => {
    const { courseId, calendarSessionId } = req.params;

    console.log('Consultando horarios para el curso:', courseId, 'y sesión de calendario:', calendarSessionId);

    if (!courseId || isNaN(courseId) || !calendarSessionId || isNaN(calendarSessionId)) {
        return res.status(400).json({ message: 'El ID del curso y la sesión de calendario son obligatorios y deben ser números.' });
    }

    try {
        const pool = await poolPromise;

        const query = `
            WITH CalendarInfo AS (
    -- Obtener las sesiones del calendario con sus fechas
    SELECT 
        OC.OrganizationCalendarId, 
        OC.CalendarYear, 
        OC.CalendarDescription, 
        OCS.OrganizationCalendarSessionId,
        OCS.BeginDate,
        OCS.EndDate
    FROM OrganizationCalendar OC
    LEFT JOIN OrganizationCalendarSession OCS 
        ON OC.OrganizationCalendarId = OCS.OrganizationCalendarId
    WHERE OC.OrganizationId = @courseId
    AND OCS.OrganizationCalendarSessionId = @calendarSessionId
)
SELECT 
    CSS.CourseSectionScheduleId AS id,
    CSS.OrganizationId AS asignaturaId,
    CSS.ClassMeetingDays AS dias,
    CONVERT(VARCHAR(8), CSS.ClassBeginningTime, 108) AS horaInicio,
    CONVERT(VARCHAR(8), CSS.ClassEndingTime, 108) AS horaFin,
    CSS.ClassPeriod AS bloque,
    'Clase' AS tipo,
    P.PersonId AS profesorId,
    P.FirstName + ' ' + P.LastName AS profesor,
    CO.OrganizationId AS cursoId,
    CO.Name AS curso,
    A.OrganizationId AS asignaturaId,
    A.Name AS asignatura,
    CSS.OrganizationCalendarSessionId AS calendarioSesionId,
    CSS.ContemplaAsistencia
FROM CourseSectionSchedule CSS
LEFT JOIN OrganizationRelationship R 
    ON CSS.OrganizationId = R.OrganizationId
LEFT JOIN Organization CO 
    ON R.Parent_OrganizationId = CO.OrganizationId
LEFT JOIN Organization A 
    ON CSS.OrganizationId = A.OrganizationId
LEFT JOIN OrganizationPersonRole OPR 
    ON A.OrganizationId = OPR.OrganizationId
     AND OPR.RoleId = 5
LEFT JOIN Person P 
    ON OPR.PersonId = P.PersonId
WHERE CO.OrganizationId = @courseId
AND CSS.OrganizationCalendarSessionId = @calendarSessionId

UNION ALL

SELECT 
    RS.RecessScheduleId AS id,
    RS.OrganizationId AS cursoId,
    RS.ClassMeetingDays AS dias,
    CONVERT(VARCHAR(8), RS.RecessBeginningTime, 108) AS horaInicio,
    CONVERT(VARCHAR(8), RS.RecessEndingTime, 108) AS horaFin,
    RS.ClassPeriod AS bloque,
    'Recreo' AS tipo,
    NULL AS profesorId,
    NULL AS profesor,
    CO.OrganizationId AS cursoId,
    CO.Name AS curso,
    NULL AS asignaturaId,
    'Recreo' AS asignatura,
    CI.OrganizationCalendarSessionId AS calendarioSesionId,
    NULL AS ContemplaAsistencia
FROM RecessSchedule RS
LEFT JOIN Organization CO 
    ON RS.OrganizationId = CO.OrganizationId
LEFT JOIN CalendarInfo CI 
    ON CI.OrganizationCalendarSessionId = @calendarSessionId
WHERE CO.OrganizationId = @courseId
AND RS.RecordStartDateTime BETWEEN CI.BeginDate AND CI.EndDate
AND (RS.RecordEndDateTime IS NULL OR RS.RecordEndDateTime <= CI.EndDate)
ORDER BY dias, horaInicio;

        `;

        const result = await pool.request()
            .input('courseId', sql.Int, courseId)
            .input('calendarSessionId', sql.Int, calendarSessionId)
            .query(query);

        console.log('Horarios obtenidos correctamente.');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los horarios por curso:', error);
        res.status(500).json({ message: 'Error al obtener los horarios.', error: error.message });
    }
};

// Actualizar un horario
exports.updateHorario = async (req, res) => {
    const { scheduleId } = req.params;
    const { classMeetingDays, classBeginningTime, classEndingTime, recordStartDateTime, recordEndDateTime } = req.body;

    console.log('Datos recibidos para actualizar el horario:', {
        scheduleId,
        classMeetingDays,
        classBeginningTime,
        classEndingTime,
        recordStartDateTime,
        recordEndDateTime,
    });

    if (!scheduleId || !classMeetingDays || !classBeginningTime || !classEndingTime || !recordStartDateTime || !recordEndDateTime) {
        console.log('Validación fallida: Faltan datos requeridos.');
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('ScheduleId', sql.Int, scheduleId)
            .input('ClassMeetingDays', sql.NVarChar, classMeetingDays)
            .input('ClassBeginningTime', sql.Time, classBeginningTime)
            .input('ClassEndingTime', sql.Time, classEndingTime)
            .input('RecordStartDateTime', sql.DateTime, recordStartDateTime)
            .input('RecordEndDateTime', sql.DateTime, recordEndDateTime)
            .query(`
                UPDATE CourseSectionSchedule
                SET ClassMeetingDays = @ClassMeetingDays,
                    ClassBeginningTime = @ClassBeginningTime,
                    ClassEndingTime = @ClassEndingTime,
                    RecordStartDateTime = @RecordStartDateTime,
                    RecordEndDateTime = @RecordEndDateTime
                WHERE CourseSectionScheduleId = @ScheduleId;
            `);

        console.log('Horario actualizado correctamente.');
        res.status(200).json({ message: 'Horario actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el horario:', error);
        res.status(500).json({ message: 'Error al actualizar el horario.', error: error.message });
    }
};


// Eliminar un horario
exports.deleteHorario = async (req, res) => {
    const { scheduleId } = req.params;
    console.log(req.params)
    console.log('Datos recibidos para eliminar el horario:', { scheduleId });

    if (!scheduleId) {
        return res.status(400).json({ message: 'El ID del horario es obligatorio.' });
    }

    try {
        const pool = await poolPromise;

        await pool.request()
            .input('ScheduleId', sql.Int, scheduleId)
            .query(`
                DELETE FROM CourseSectionSchedule
                WHERE CourseSectionScheduleId = @ScheduleId;
            `);

        console.log('Horario eliminado correctamente.');
        res.status(200).json({ message: 'Horario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el horario:', error);
        res.status(500).json({ message: 'Error al eliminar el horario.', error: error.message });
    }
};


// Eliminar recreo
exports.deleteRecreo = async (req, res) => {
  const { scheduleId } = req.params;

  console.log('Datos recibidos para eliminar RECREO:', { scheduleId });

  if (!scheduleId) {
    return res.status(400).json({ message: 'El ID del recreo es obligatorio.' });
  }

  try {
    const pool = await poolPromise;

    await pool.request()
      .input('ScheduleId', sql.Int, scheduleId)
      .query(`
        DELETE FROM RecessSchedule
        WHERE RecessScheduleId = @ScheduleId;
      `);

    console.log('Recreo eliminado correctamente.');
    res.status(200).json({ message: 'Recreo eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar el recreo:', error);
    res.status(500).json({ message: 'Error al eliminar el recreo.', error: error.message });
  }
};





//Fin Nuevos***********************************************************************************




// Obtener horarios por curso
exports.getHorarios = async (req, res) => {
    try {
        console.log('Consultando horarios...');
        const { courseId } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('CourseId', sql.Int, courseId)
            .query(`
                SELECT 
                    S.ScheduleId AS id,
                    C.Name AS curso,
                    B.Description AS bloque,
                    Sub.Name AS asignatura,
                    P.FirstName + ' ' + P.LastName AS profesor,
                    S.Day AS dia
                FROM Schedules S
                INNER JOIN Courses C ON S.CourseId = C.CourseId
                INNER JOIN OrganizationCalendarSession B ON S.BlockId = B.OrganizationCalendarSessionId
                INNER JOIN Subjects Sub ON S.SubjectId = Sub.SubjectId
                INNER JOIN Persons P ON S.TeacherId = P.PersonId
                WHERE S.CourseId = @CourseId
            `);

        console.log('Horarios obtenidos correctamente.');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los horarios2:', error);
        res.status(500).json({ message: 'Error al obtener los horarios2.', error: error.message });
    }
};

// Crear un horario
exports.createHorario = async (req, res) => {
    const { courseId, blockId, subjectId, teacherId, day } = req.body;

    console.log('Datos recibidos para crear un horario:', { courseId, blockId, subjectId, teacherId, day });

    if (!courseId || !blockId || !subjectId || !teacherId || !day) {
        console.log('Validación fallida: Faltan datos requeridos.');
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const pool = await poolPromise;
        console.log('Insertando un nuevo horario en la base de datos...');
        await pool.request()
            .input('CourseId', sql.Int, courseId)
            .input('BlockId', sql.Int, blockId)
            .input('SubjectId', sql.Int, subjectId)
            .input('TeacherId', sql.Int, teacherId)
            .input('Day', sql.NVarChar, day)
            .query(`
                INSERT INTO CourseSectionSchedule (CourseId, BlockId, SubjectId, TeacherId, Day)
                VALUES (@CourseId, @BlockId, @SubjectId, @TeacherId, @Day)
            `);

        console.log('Horario creado correctamente.');
        res.status(201).json({ message: 'Horario creado correctamente.' });
    } catch (error) {
        console.error('Error al crear el horario:', error);
        res.status(500).json({ message: 'Error al crear el horario.', error: error.message });
    }
};

// Editar un horario
exports.editHorario = async (req, res) => {
    const { id } = req.params;
    const { courseId, blockId, subjectId, teacherId, day } = req.body;

    console.log('Datos recibidos para editar un horario:', { id, courseId, blockId, subjectId, teacherId, day });

    if (!id || !courseId || !blockId || !subjectId || !teacherId || !day) {
        console.log('Validación fallida: Faltan datos requeridos.');
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        const pool = await poolPromise;
        console.log('Actualizando horario en la base de datos...');
        await pool.request()
            .input('ScheduleId', sql.Int, id)
            .input('CourseId', sql.Int, courseId)
            .input('BlockId', sql.Int, blockId)
            .input('SubjectId', sql.Int, subjectId)
            .input('TeacherId', sql.Int, teacherId)
            .input('Day', sql.NVarChar, day)
            .query(`
                UPDATE CourseSectionSchedule
                SET CourseId = @CourseId,
                    BlockId = @BlockId,
                    SubjectId = @SubjectId,
                    TeacherId = @TeacherId,
                    Day = @Day
                WHERE ScheduleId = @ScheduleId
            `);

        console.log('Horario actualizado correctamente.');
        res.status(200).json({ message: 'Horario actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el horario:', error);
        res.status(500).json({ message: 'Error al actualizar el horario.', error: error.message });
    }
};






// Eliminar un horario

/*
exports.deleteHorario = async (req, res) => {
    const { scheduleId } = req.params;
    console.log(req.params);
    console.log('Datos recibidos para eliminar un horario:', { scheduleId });

    if (!scheduleId ) {
        console.log('Validación fallida: Falta el ID del horario.');
        return res.status(400).json({ message: 'El ID del horario es obligatorio.' });
    }

    try {
        const pool = await poolPromise;
        console.log(`Eliminando horario con ID: ${scheduleId }...`);
        const result = await pool.request()
            .input('ScheduleId', sql.Int, scheduleId )
            .query(`
                DELETE FROM CourseSectionSchedule
                WHERE ScheduleId = @ScheduleId
            `);

        if (result.rowsAffected[0] === 0) {
            console.log(`No se encontró el horario con ID: ${scheduleId}`);
            return res.status(404).json({ message: 'No se encontró el horario especificado.' });
        }

        console.log(`Horario eliminado correctamente: ID ${scheduleId}`);
        res.status(200).json({ message: 'Horario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el horario:', error);
        res.status(500).json({ message: 'Error al eliminar el horario.', error: error.message });
    }
};
*/




exports.getCodigosEnsenanzaHorarios = async (req, res) => {
    const { colegioId } = req.params;

    if (!colegioId) {
        return res.status(400).json({ message: 'El ID del colegio es obligatorio.' });
    }

    try {
        const pool = await poolPromise;
        const query = `
           WITH RecursiveHierarchy AS (
               -- Paso inicial: Seleccionar el colegio como punto de partida
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
           )
           SELECT 
               rh.OrganizationId, 
               rh.Name
           FROM 
               RecursiveHierarchy rh
           INNER JOIN 
               RefOrganizationType ref ON rh.RefOrganizationTypeId = ref.RefOrganizationTypeId
           WHERE 
               ref.RefOrganizationElementTypeId = 45; -- Solo códigos de enseñanza
        `;

        const result = await pool.request()
            .input('ColegioId', sql.Int, colegioId)
            .query(query);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los códigos de enseñanza:', error);
        res.status(500).json({ message: 'Error al obtener los códigos de enseñanza.' });
    }
};




exports.getCursosPorGradosYLetras = async (req, res) => {
    const { parentOrganizationId } = req.params;

    if (!parentOrganizationId) {
        return res.status(400).json({ message: 'El ID de la organización principal es obligatorio.' });
    }

    try {
        const pool = await poolPromise;

        const query = `
            WITH Grados AS (
                -- CTE para obtener los grados
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
                    rel.Parent_OrganizationId = @ParentOrganizationId
                    AND ref.RefOrganizationElementTypeId = 46 -- Grados
            ),
            Letras AS (
                -- CTE para obtener las letras
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
                    ref.RefOrganizationElementTypeId = 21 -- Letras
            )
            -- Combinar grados y letras
            SELECT DISTINCT
                CONCAT(g.GradoName, ' - ', l.LetraName) AS Curso,
                CONCAT(g.GradoId, '-', l.LetraId) AS Valor,
                g.GradoName,
                l.LetraName
            FROM 
                Grados g
            LEFT JOIN 
                Letras l ON g.GradoId = l.GradoId
            ORDER BY 
                g.GradoName, l.LetraName;
        `;

        const result = await pool.request()
            .input('ParentOrganizationId', sql.Int, parentOrganizationId)
            .query(query);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los cursos por grados y letras:', error);
        res.status(500).json({ message: 'Error al obtener los cursos por grados y letras.', error: error.message });
    }
};




// Obtener profesores por colegio y asignatura
exports.getProfesoresPorColegioYAsignatura = async (req, res) => {
    const { colegioId, asignaturaId } = req.params;

    if (!colegioId || !asignaturaId) {
        return res.status(400).json({ message: 'El ID del colegio y de la asignatura son obligatorios.' });
    }

    try {
        const pool = await poolPromise;

        // Consulta para obtener los profesores que dictan una asignatura específica en un colegio
        const query = `
            WITH RecursiveHierarchy AS (
                -- Inicia desde el colegio y recorre la jerarquía hacia las asignaturas
                SELECT 
                    ORel.OrganizationId AS AsignaturaId,
                    ORel.Parent_OrganizationId AS ColegioId
                FROM 
                    OrganizationRelationship ORel
                WHERE 
                    ORel.Parent_OrganizationId = @ColegioId

                UNION ALL

                SELECT 
                    ORel.OrganizationId AS AsignaturaId,
                    RH.ColegioId
                FROM 
                    OrganizationRelationship ORel
                INNER JOIN 
                    RecursiveHierarchy RH ON ORel.Parent_OrganizationId = RH.AsignaturaId
            ),
            ProfesoresAsignatura AS (
                SELECT 
                    P.PersonId AS ProfesorId,
                    CONCAT(P.FirstName, ' ', P.LastName) AS ProfesorNombre,
                    A.OrganizationId AS AsignaturaId
                FROM 
                    OrganizationPersonRole OPR
                INNER JOIN 
                    Person P ON OPR.PersonId = P.PersonId
                INNER JOIN 
                    Organization A ON OPR.OrganizationId = A.OrganizationId
                WHERE 
                    OPR.RoleId = 5 -- ID del rol para profesor
            )
            SELECT DISTINCT 
                PA.ProfesorId,
                PA.ProfesorNombre
            FROM 
                ProfesoresAsignatura PA
            INNER JOIN 
                RecursiveHierarchy RH ON PA.AsignaturaId = RH.AsignaturaId
            WHERE 
                RH.ColegioId = @ColegioId
                AND PA.AsignaturaId = @AsignaturaId
            ORDER BY 
                PA.ProfesorNombre;
        `;

        const result = await pool.request()
            .input('ColegioId', sql.Int, colegioId)
            .input('AsignaturaId', sql.Int, asignaturaId)
            .query(query);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al obtener los profesores por colegio y asignatura:', error);
        res.status(500).json({ message: 'Error al obtener los profesores.', error: error.message });
    }
};


exports.getAsignaturasPorCurso = async (req, res) => {
    let { cursoId } = req.params;
    console.log(`Valor recibido de cursoId: ${cursoId}, Tipo: ${typeof cursoId}`);

    // Validación para asegurar que cursoId sea un número
    if (!cursoId || isNaN(cursoId)) {
        return res.status(400).json({ message: "El ID del curso debe ser un número válido." });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("CursoId", sql.Int, parseInt(cursoId, 10)) // Convertir a número
            .query(`
                SELECT 
                    A.OrganizationId AS AsignaturaId,
                    A.Name AS AsignaturaName
                FROM 
                    Organization A
                INNER JOIN 
                    OrganizationRelationship R ON A.OrganizationId = R.OrganizationId
                INNER JOIN 
                    RefOrganizationType RT ON A.RefOrganizationTypeId = RT.RefOrganizationTypeId
                WHERE 
                    R.Parent_OrganizationId = @CursoId  
                    AND RT.RefOrganizationElementTypeId = 22;
            `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error al obtener las asignaturas:", error);
        res.status(500).json({ message: "Error al obtener las asignaturas." });
    }
};

// Obtener los años y sesiones de calendario disponibles para un curso
exports.getAnos = async (req, res) => {
    const { cursoOrganizationId } = req.params;  // Recibe el ID del curso

    if (!cursoOrganizationId  || isNaN(cursoOrganizationId )) {
        return res.status(400).json({ message: "El ID del curso es obligatorio y debe ser un número." });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("cursoOrganizationId", sql.Int, cursoOrganizationId)
            .query(`
                SELECT 
                    OC.OrganizationCalendarId, 
                    OC.CalendarYear, 
                    OC.CalendarDescription, 
                    OCS.OrganizationCalendarSessionId,
                    FORMAT(OCS.BeginDate, 'yyyy-MM-dd') + ' al ' + FORMAT(OCS.EndDate, 'yyyy-MM-dd') AS Periodo,
                    OCS.BeginDate,
                    OCS.EndDate
                FROM OrganizationCalendar OC
                LEFT JOIN OrganizationCalendarSession OCS 
                    ON OC.OrganizationCalendarId = OCS.OrganizationCalendarId
                WHERE OC.OrganizationId = @cursoOrganizationId
                ORDER BY OC.CalendarYear DESC, OCS.BeginDate;
            `);
        
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error al obtener los años disponibles:", error);
        res.status(500).json({ message: "Error al obtener los años disponibles." });
    }
};



exports.actualizarAsistencia = async (req, res) => {
  try {
    const {
      organizationId,
      classMeetingDays,
      classBeginningTime,
      classEndingTime,
      organizationCalendarSessionId,
      asistencia
    } = req.body;

    const pool = await poolPromise;

    const result = await pool.request()
      .input("OrganizationId", sql.Int, organizationId)
      .input("ClassMeetingDays", sql.NVarChar, classMeetingDays)
      .input("ClassBeginningTime", sql.VarChar, classBeginningTime)
      .input("ClassEndingTime", sql.VarChar, classEndingTime)
      .input("OrganizationCalendarSessionId", sql.Int, organizationCalendarSessionId)
      .input("ContemplaAsistencia", sql.Bit, asistencia ? 1 : 0)
      .query(`
        UPDATE CourseSectionSchedule
        SET ContemplaAsistencia = @ContemplaAsistencia
        WHERE 
          OrganizationId = @OrganizationId AND
          ClassMeetingDays = @ClassMeetingDays AND
          ClassBeginningTime = @ClassBeginningTime AND
          ClassEndingTime = @ClassEndingTime AND
          OrganizationCalendarSessionId = @OrganizationCalendarSessionId
      `);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: asistencia ? "✔️ Bloque marcado para asistencia" : "❌ Bloque desmarcado de asistencia" });
    } else {
      res.status(404).json({ message: "No se encontró el bloque para actualizar" });
    }
  } catch (error) {
    console.error("❌ Error en actualizarAsistencia:", error);
    res.status(500).json({ message: "Error al actualizar asistencia" });
  }
};

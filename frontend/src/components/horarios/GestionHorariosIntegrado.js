// ======================================================
//  Archivo: GestionHorariosIntegrado.js
//  Objetivo: Que las asignaturas y profesores aparezcan
//            incluso cuando se replican horarios y
//            ya vienen asignaturas (sin que el usuarioe
//            deba cambiar manualmente).
// ======================================================

import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/horarios.css"; // Ajusta la ruta si tu CSS está en otro lado
import { FaStar ,FaTrash } from "react-icons/fa";
import RoleService from '../../services/RoleService';

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

  
const detectarSolapamientos = (horariosActualizados) => {
 
const normalizarHora = (hora) => {
  if (!hora) return "00:00:00";
  const partes = hora.split(":");
  if (partes.length === 2) return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}:00`;
  if (partes.length === 3) return `${partes[0].padStart(2, "0")}:${partes[1].padStart(2, "0")}:${partes[2].padStart(2, "0")}`;
  return "00:00:00";
};
 
	
	
  const copia = { ...horariosActualizados };

  for (const [dia, bloques] of Object.entries(copia)) {
    for (let i = 0; i < bloques.length; i++) {
      bloques[i].tieneSolape = false;
    }

    for (let i = 0; i < bloques.length; i++) {
      const b1 = bloques[i];
      if (!b1.horaInicio || !b1.horaTermino) continue;
      const ini1 = new Date(`2020-01-01T${normalizarHora(b1.horaInicio)}`);
      const fin1 = new Date(`2020-01-01T${normalizarHora(b1.horaTermino)}`);


      for (let j = 0; j < bloques.length; j++) {
        if (i === j) continue;
        const b2 = bloques[j];
        if (!b2.horaInicio || !b2.horaTermino) continue;
        const ini2 = new Date(`2020-01-01T${normalizarHora(b2.horaInicio)}`);
        const fin2 = new Date(`2020-01-01T${normalizarHora(b2.horaTermino)}`);


        if (ini1 < fin2 && fin1 > ini2) {
          bloques[i].tieneSolape = true;
          bloques[j].tieneSolape = true;
        }
      }
    }
  }

  return copia;
};




const GestionHorariosIntegrado = () => {
  const [colegios, setColegios] = useState([]);
  const [codigoEnsenanza, setCodigoEnsenanza] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState("");
  const [selectedCodigoEnsenanza, setSelectedCodigoEnsenanza] = useState("");
  const [selectedCurso, setSelectedCurso] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [colegioDisabled, setColegioDisabled] = useState(false);

  const [calendarios, setCalendarios] = useState([]);
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [deHoyEnAdelante, setDeHoyEnAdelante] = useState(false);

  // Estructura de horarios
  const [horarios, setHorarios] = useState({
    Lunes: [],
    Martes: [],
    Miércoles: [],
    Jueves: [],
    Viernes: [],
  });

  // Catálogos
  const [opcionesBloques, setOpcionesBloques] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  // Almacena profesores por ID de asignatura: { [idAsignatura]: [ {ProfesorId, ProfesorNombre}, ... ] }
  const [profesoresPorAsignatura, setProfesoresPorAsignatura] = useState({});

  // Edit 1: Extraer lógica de carga de códigos de enseñanza
  const fetchCodigosEnsenanza = async (colegioId) => {
    if (!colegioId) {
      setCodigoEnsenanza([]);
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/horarios/codense/${colegioId}`);
      setCodigoEnsenanza(res.data || []);
    } catch (error) {
      console.error("Error al obtener códigos de enseñanza:", error);
      setErrorMessage("Error al cargar los códigos de enseñanza.");
    }
  };

  // 1) Cargar colegios y bloques al montar
  useEffect(() => {
    const fetchColegios = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/obtener-colegios");
        setColegios(res.data || []);

        // Validar rol y bloquear select si corresponde
        const usuario = RoleService.getUsuario();
        const roleId = usuario?.RoleId ? Number(usuario.RoleId) : null;
        if ((roleId === 11 || roleId === 13) && usuario?.SchoolId) {
          const schoolId = Number(usuario.SchoolId);
          setSelectedColegio(schoolId);
          setColegioDisabled(true);
          fetchCodigosEnsenanza(schoolId);
        } else {
          setColegioDisabled(false);
        }
      } catch (error) {
        console.error("Error al obtener los colegios:", error);
        setErrorMessage("Error al cargar los colegios. Intente nuevamente.");
      }
    };

    const fetchBloques = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/bloques");
        setOpcionesBloques(res.data || []);
      } catch (error) {
        console.error("Error al cargar bloques:", error);
      }
    };

    fetchColegios();
    fetchBloques();
  }, []);
  
  // Edit 2: Ajustar manejador de cambio de colegio
  const manejarCambioColegio = (e) => {
    const colegioId = Number(e.target.value) || 0;
    setSelectedColegio(colegioId);
    setSelectedCodigoEnsenanza("");
    setSelectedCurso("");
    setHorarios({ Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] });

    // NO re-habilitamos el selector aquí
    fetchCodigosEnsenanza(colegioId);

    if (!colegioId) {
      setCursos([]);
    }
  };

  // 3) Cambio de codEnseñanza => cargar cursos
  const manejarCambioCodigoEnsenanza = async (e) => {
    const codEnsId = Number(e.target.value) || 0;
    setSelectedCodigoEnsenanza(codEnsId);
    setSelectedCurso("");
    setHorarios({ Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] });

    if (!codEnsId) {
      setCursos([]);
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/api/horarios/cursos/${codEnsId}`);
      setCursos(res.data || []);
    } catch (error) {
      console.error("Error al obtener los cursos:", error);
      setErrorMessage("Error al cargar los cursos.");
    }
  };

  // 4) Al seleccionar un curso => cargar asignaturas y calendarios
  useEffect(() => {
    if (!selectedCurso) return;

    const partes = selectedCurso.split("-");
    const cursoId = partes.length > 1 ? partes[1].trim() : selectedCurso;

    const fetchAsignaturas = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/horarios/asignaturas/curso/${cursoId}`
        );
        setAsignaturas(res.data || []);
      } catch (error) {
        console.error("Error al cargar asignaturas:", error);
      }
    };

    const fetchCalendarios = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/horarios/getanos/${cursoId}`
        );
        setCalendarios(res.data || []);
      } catch (error) {
        console.error("Error al cargar calendarios:", error);
      }
    };

    fetchAsignaturas();
    fetchCalendarios();
  }, [selectedCurso]);

  // Helper para ID real
  const getCursoIdLimpio = () => {
    if (!selectedCurso) return "";
    const partes = selectedCurso.split("-");
    return partes.length > 1 ? partes[1].trim() : selectedCurso;
  };

  // 5) Replicar (cargar) horarios

const cargarHorarios = async () => {
  const cursoIdLimpio = getCursoIdLimpio();
  if (!calendarioSeleccionado || !cursoIdLimpio) {
    alert("Seleccione un calendario y un curso para cargar los horarios.");
    return;
  }

  // ✅ NUEVA VALIDACIÓN:
  if (!opcionesBloques.length) {
    alert("Los bloques aún no están disponibles. Intente nuevamente en unos segundos.");
    return;
  }

  try {
    const response = await axios.get(
      `http://localhost:5000/api/horarios/detalle/${cursoIdLimpio}/${calendarioSeleccionado}`
    );
    const data = response.data || [];

    if (!data.length) {
      alert("No hay horarios para este curso.");
      return;
    }

    const nuevosHorarios = {
      Lunes: [],
      Martes: [],
      Miércoles: [],
      Jueves: [],
      Viernes: [],
    };

    data.forEach((hor) => {
      if (!nuevosHorarios[hor.dias]) {
        nuevosHorarios[hor.dias] = [];
      }

      let asigId = Array.isArray(hor.asignaturaId) ? hor.asignaturaId.find(x => x != null) || "" : hor.asignaturaId;
      let profId = Array.isArray(hor.profesorId) ? hor.profesorId.find(x => x != null) || "" : hor.profesorId;

      const tipoBloque = hor.asignatura === "Recreo" || !profId ? "Recreo" : "Clase";

      // ✅ Recalcular duración en minutos
      const horaInicio = (hor.horaInicio || hor.classBeginningTime || "").trim();
      const horaFin = (hor.horaFin || hor.classEndingTime || "").trim();

	let duracionBackend = 0;
	if (horaInicio && horaFin) {
  	const [h1, m1, s1] = horaInicio.split(":").map(Number);
  	const [h2, m2, s2] = horaFin.split(":").map(Number);

  	const inicioMin = h1 * 60 + m1 + (s1 || 0) / 60;
  	const finMin = h2 * 60 + m2 + (s2 || 0) / 60;

  	duracionBackend = Math.abs(finMin - inicioMin);
	} else {
  	console.warn("⛔ Formato de hora inválido:", { horaInicio, horaFin });
  	duracionBackend = NaN;
	}


   	const duracionRedondeada = Math.round(duracionBackend); // Evita decimales sueltos
	const tipoNormalizado = tipoBloque?.toLowerCase().trim();

console.log("📋 Bloques disponibles:", opcionesBloques.map(b => ({
  id: b.id,
  nombre: b.nombre,
  tipo: b.tipo,
  duracion: b.duracion
})));

console.log("🔎 Buscando bloque con:", {
  tipoNormalizado,
  duracionRedondeada
});


const normalizarTipo = (tipo) => {
  const limpio = (tipo || "").toLowerCase().replace(/\s+/g, '').trim();
  if (limpio.includes("clase")) return "clase";
  if (limpio.includes("recreo")) return "recreo";
  if (limpio.includes("electivo")) return "electivo";
  return limpio;
};

const bloqueCoincidente = opcionesBloques.find((b) => {
  const tipoBloqueCatalogo = normalizarTipo(b.tipo);
  const tipoBuscado = normalizarTipo(tipoBloque);

  const duracionBloque = Math.round(Number(b.duracion));
  const coincidenTipos = tipoBloqueCatalogo === tipoBuscado;
  const coincidenDuracion = Math.abs(duracionBloque - duracionRedondeada) <= 2;

  return coincidenTipos && coincidenDuracion;
});

if (!bloqueCoincidente) {
  console.warn("⚠️ No se encontró bloque para:", {
    tipoNormalizado,
    duracionRedondeada,
    bloquesDisponibles: opcionesBloques.map(b => ({
      tipo: (b.tipo || "").toLowerCase().replace(/\s+/g, '').trim(),
      duracion: Math.round(Number(b.duracion))
    }))
  });
} else {
  console.log("✅ Bloque encontrado:", bloqueCoincidente);
}



     const bloqueId = bloqueCoincidente ? Number(bloqueCoincidente.id) : null;


			  nuevosHorarios[hor.dias].push({
		  scheduleId: hor.id,
		  horaInicio,
		  horaTermino: horaFin,
		  asignatura: asigId,
		  profesor: profId,
		  tipo: tipoBloque,
		  bloqueId,
		  asistencia: hor.ContemplaAsistencia === true || hor.ContemplaAsistencia === 1 ? true : false,
		  modificado: false,
		  numeroBloque: nuevosHorarios[hor.dias].length + 1 // ← aquí guardamos el número fijo
		});

    });
   
    console.log("Horarios construidos:", JSON.stringify(nuevosHorarios, null, 2));
    console.log("Previsualización de asistencias cargadas:", nuevosHorarios);


    setHorarios(detectarSolapamientos(nuevosHorarios));


    // Cargar profesores como ya lo haces...
    for (const dia of Object.keys(nuevosHorarios)) {
      for (const bloque of nuevosHorarios[dia]) {
        if (bloque.tipo !== "Recreo" && bloque.asignatura) {
          if (!profesoresPorAsignatura[bloque.asignatura]) {
            try {
              const respProf = await axios.get(
                `http://localhost:5000/api/horarios/profesores/${selectedColegio}/asignatura/${bloque.asignatura}`
              );
              setProfesoresPorAsignatura((prev) => ({
                ...prev,
                [bloque.asignatura]: respProf.data,
              }));
            } catch (error) {
              console.error("Error al cargar profesores (replicar)", error);
            }
          }
        }
      }
    }

    alert("Horarios cargados correctamente.");
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    alert("Ocurrió un error al cargar los horarios.");
  }
};





  // 6) Guardar
  
 const formatearHora = (hora) => {
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


  



const manejarGuardarCambios = async () => {
  const cursoId = getCursoIdLimpio();

  const bloquesInvalidos = Object.entries(horarios).flatMap(([dia, bloques]) =>
  bloques
    .filter(b => b.modificado || !b.scheduleId)
    .map((b, idx) => {
      const errores = [];

      // Validaciones de hora (presencia y formato)
      if (!b.horaInicio || !b.horaTermino) {
        errores.push("hora");
      } else {
        const horaInicioValida = /^([01]\d|2[0-3]):[0-5]\d$/.test(b.horaInicio) || /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(b.horaInicio);
        const horaTerminoValida = /^([01]\d|2[0-3]):[0-5]\d$/.test(b.horaTermino) || /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(b.horaTermino);
        if (!horaInicioValida) errores.push("hora inicio inválida");
        if (!horaTerminoValida) errores.push("hora término inválida");
      }

      // Validaciones de asignatura y profesor (excepto para recreos)
      if (b.tipo !== "Recreo" && (!b.asignatura || !b.profesor)) {
        errores.push("asignatura o profesor");
      }

      return errores.length > 0 ? { dia, idx, errores } : null;
    })
).filter(x => x !== null);

  
  
  if (bloquesInvalidos.length > 0) {
    const detalles = bloquesInvalidos
      .map(b => `Día: ${b.dia}, Bloque: ${b.idx + 1}, Campos faltantes: ${b.errores.join(", ")}`)
      .join("\n");
    alert(`❌ Algunos bloques tienen datos incompletos:\n${detalles}`);
    return;
  }

						// en lugar de excluirlos, inclúyelos
			const nuevos = Object.entries(horarios).flatMap(([dia, bloques]) =>
			  bloques
				.filter(b => !b.scheduleId)
				.map((b, idx) => {
				  const esRecreo = (b.tipo || "").toLowerCase() === "recreo";

				  // calcular el índice del recreo exacto
				  const recreosDelDia = bloques.filter(bb => bb.tipo?.toLowerCase() === "recreo");
				  const idxRecreo = recreosDelDia.findIndex(r =>
					formatearHora(r.horaInicio) === formatearHora(b.horaInicio) &&
					formatearHora(r.horaTermino) === formatearHora(b.horaTermino)
				  );

				  return {
					tipoBloque: b.tipo || "Clase",
					ClassMeetingDays: dia,
					ClassBeginningTime: formatearHora(b.horaInicio || "00:00"),
					ClassEndingTime: formatearHora(b.horaTermino || "00:00"),
					RefSubjectId: esRecreo ? null : Number(b.asignatura),
					OrganizationPersonRoleId: esRecreo ? null : Number(b.profesor),
					ContemplaAsistencia: b.asistencia === true,
					bloqueId: b.bloqueId || null,
					ClassPeriod: `Bloque ${b.numeroBloque || idx + 1}`

				  };
				})
			);


		const modificados = Object.entries(horarios).flatMap(([dia, bloques]) =>
		  bloques
		    .filter(b => b.scheduleId && b.modificado && (b.tipo || "").toLowerCase() !== "recreo")
 
		

			.map(b => {
			  const esRecreo = (b.tipo || "").toLowerCase() === "recreo";
			  return {
				scheduleId: b.scheduleId,
				ClassMeetingDays: dia,
				ClassBeginningTime: formatearHora(b.horaInicio || "00:00"),
				ClassEndingTime: formatearHora(b.horaTermino || "00:00"),
				RefSubjectId: esRecreo ? null : Number(b.asignatura),
				OrganizationPersonRoleId: esRecreo ? null : Number(b.profesor),
				ContemplaAsistencia: b.asistencia === true,
			  };
			})
		);


  if (nuevos.length === 0 && modificados.length === 0) {
    alert("No hay cambios que guardar.");
    return;
  }

  console.log("📤 Enviando a /actualizar:", {
    calendarSessionId: calendarioSeleccionado,
    cursoId,
    nuevos,
    modificados
  });

  try {
    const response = await axios.post("http://localhost:5000/api/horarios/actualizar", {
  calendarSessionId: calendarioSeleccionado,
  cursoId,
  nuevos,
  modificados
});

if (response.data.bloquesConId) {
  const nuevosIds = response.data.bloquesConId;

  setHorarios((prev) => {
  const copia = { ...prev };

  nuevosIds.forEach((bloqueNuevo) => {
    const dia = bloqueNuevo.classMeetingDays;
    const inicio = bloqueNuevo.classBeginningTime;
    const fin = bloqueNuevo.classEndingTime;

    const idx = copia[dia].findIndex(
      b =>
        formatearHora(b.horaInicio) === formatearHora(inicio) &&
        formatearHora(b.horaTermino) === formatearHora(fin) &&
        !b.scheduleId
    );

    if (idx !== -1) {
      copia[dia][idx].scheduleId = bloqueNuevo.scheduleId;
    }
  });

  return detectarSolapamientos(copia);
});

  
  
}

alert("Cambios guardados correctamente");

	
  } catch (error) {
    console.error("❌ Error en guardar cambios:", error);
    if (error.response?.data?.error) {
      alert(`⛔ ${error.response.data.error}`);
    } else {
      alert("Error al guardar los cambios.");
    }
  }
};



  
  
const manejarGuardarHorarios = async () => {
  const cursoIdLimpio = getCursoIdLimpio();
  
  const hayBloquesConSolape = Object.values(horarios).some(dia =>
		  dia.some(b => b.tieneSolape === true)
		);

		if (hayBloquesConSolape) {
		  alert("⛔ No se puede guardar: existen bloques con solapamiento. Corrígelos antes de continuar.");
		  return;
		}


		  if (!cursoIdLimpio) {
			alert("El curso no ha sido seleccionado.");
			return;
		  }
			  
			 
  
  
		 if (deHoyEnAdelante) {
		  if (!fechaFin) {
			alert("Por favor, indique una fecha de término si elige 'De hoy en adelante'.");
			return;
		  }
		} else {
		  if (!fechaInicio || !fechaFin) {
			alert("Debe ingresar tanto la fecha de inicio como la de fin.");
			return;
		  }
		}


		  const rango = {
		  beginDate: deHoyEnAdelante
			? new Date().toISOString().split("T")[0]
			: fechaInicio,
		  endDate: fechaFin
		};


  const payload = {
    calendarData: {
      organizationId: cursoIdLimpio,
      calendarCode: `CAL-${cursoIdLimpio}`,
      calendarDescription: "Calendario generado automáticamente",
      calendarYear: new Date().getFullYear(),
      sessions: [
        {
          beginDate: rango.beginDate,
          endDate: rango.endDate,
          description: "Sesión automática para horarios",
        },
      ],
    },
    horarios: [],
  };

  // Convertir horarios a payload con número de bloque por día
  Object.entries(horarios).forEach(([dia, bloques]) => {
    bloques.forEach((bloque, idx) => {
		
		
		
      const recreosDelDia = bloques
      .filter(b => b.tipo?.toLowerCase() === "recreo")
      .map((b, i) => ({
        index: i,
        inicio: formatearHora(b.horaInicio),
        fin: formatearHora(b.horaTermino),
      }));

    const idxRecreo = bloque.tipo?.toLowerCase() === "recreo"
      ? recreosDelDia.findIndex(r =>
          r.inicio === formatearHora(bloque.horaInicio) &&
          r.fin === formatearHora(bloque.horaTermino)
        )
      : null;
		
		const yaExiste = payload.horarios.find(p =>
		  p.classMeetingDays === dia &&
		  p.classBeginningTime === formatearHora(bloque.horaInicio) &&
		  p.classEndingTime === formatearHora(bloque.horaTermino)
		);
		if (yaExiste) return;

		
		

      payload.horarios.push({
        scheduleId: bloque.scheduleId || null,
        classMeetingDays: dia,
        classBeginningTime: formatearHora(bloque.horaInicio),
        classEndingTime: formatearHora(bloque.horaTermino),
        classPeriod: `Bloque ${bloque.numeroBloque || idx + 1}`,
        organizationId: (bloque.tipo?.toLowerCase() === "recreo")
          ? Number(getCursoIdLimpio())
          : (bloque.asignatura ? Number(bloque.asignatura) : null),
        asignatura: cursoIdLimpio,
        profesor: bloque.profesor ? Number(bloque.profesor) : null,
        tipoBloque: (bloque.tipo || "Clase").toLowerCase().trim().replace(/s$/, ""),
        bloqueId: bloque.bloqueId ? Number(bloque.bloqueId) : null,
        asistencia: bloque.asistencia === true
      });
    });
  });
  
  
  if (payload.horarios.length === 0) {
  alert("No hay bloques para guardar. Verifica que hayas ingresado horarios.");
  return;
}
  

 // Enviar al backend
  try {
    const response = await axios.post("http://localhost:5000/api/horarios/bulk", payload);

    if (response.data.bloquesConId && response.data.bloquesConId.length > 0) {
      const nuevosHorarios = { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] };
      response.data.bloquesConId.forEach((b) => {
        if (!nuevosHorarios[b.classMeetingDays]) nuevosHorarios[b.classMeetingDays] = [];

        const tipoNormalizado = (b.tipoBloque || "").toLowerCase().trim();
        const esRecreo = tipoNormalizado === "recreo" || (!b.profesor && b.organizationId === cursoIdLimpio);

        nuevosHorarios[b.classMeetingDays].push({
          scheduleId: b.scheduleId,
          horaInicio: b.classBeginningTime,
          horaTermino: b.classEndingTime,
          asignatura: esRecreo ? cursoIdLimpio : b.organizationId,
          profesor: b.profesor || null,
          tipo: esRecreo ? "Recreo" : "Clase",
          bloqueId: b.bloqueId || null,
          asistencia: b.asistencia === true,
          numeroBloque: nuevosHorarios[b.classMeetingDays].length + 1
        });
      });

      setHorarios(detectarSolapamientos(nuevosHorarios));

      alert("✅ Horarios guardados correctamente.");
    } else {
      alert("⚠️ No se guardaron bloques. Es posible que el rango de fechas se solape con otro existente, o que no haya bloques válidos para guardar.");
    }

		} catch (error) {
		  console.error("❌ Error al guardar horarios:", error);

		  const responseData = error?.response?.data || {};
		  const codigoError = responseData.codigo;
		  const mensajeError = responseData.message || "Ocurrió un error desconocido.";

		  console.log("📦 Error.response.data recibido:", responseData);

		  if (codigoError === "SOLAPAMIENTO_SESION") {
			alert(`⛔ ${mensajeError}`);
		  } else if (codigoError === "NINGUN_BLOQUE_INSERTADO") {
			alert("⚠️ No se guardaron bloques. Es posible que ya existieran o que no haya datos válidos.");
		  } else if (mensajeError) {
			alert(`⛔ ${mensajeError}`);
		  } else {
			alert("⛔ Error inesperado al guardar los horarios.");
		  }
		}



};



  // 7) Agregar Bloque
  const agregarNuevoBloque = (dia) => {
    const ultimo = horarios[dia][horarios[dia].length - 1] || {
      horaTermino: "08:00",
    };
   const nuevoBloque = {
  tipo: "Clase",
  bloqueId: "",
  horaInicio: ultimo.horaTermino,
  horaTermino: "",
  asignatura: "",
  profesor: "",
  asistencia: false,
  numeroBloque: horarios[dia].length + 1,
  tieneSolape: false
};


   setHorarios((prev) => {
  const nuevosHorarios = {
    ...prev,
    [dia]: [...prev[dia], nuevoBloque],
  };
  return detectarSolapamientos(nuevosHorarios);
});
};
  


  
  

  // 8) Manejo de cambio en bloque
	const handleChangeBloque = (dia, index, campo, valor) => {
  setHorarios((prev) => {
    const copiaDia = [...prev[dia]];
    const bloque = { ...copiaDia[index], [campo]: valor };

    let recalculo = false;

    // Si cambia el bloqueId, recalcular automáticamente la hora de término
    if (campo === "bloqueId") {
      const bloqueSel = opcionesBloques.find(b => b.id === Number(valor));
      if (bloqueSel && bloque.horaInicio) {
        bloque.tipo = bloqueSel.tipo;
        const [h, m] = bloque.horaInicio.split(":").map(Number);
        const totalMin = h * 60 + m + bloqueSel.duracion;
        const hora = Math.floor(totalMin / 60);
        const minutos = totalMin % 60;
        bloque.horaTermino = `${hora.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
        recalculo = true;
		bloque.modificado = true; 
      }
    }

    // Actualizar el bloque
    copiaDia[index] = bloque;
    const nuevosHorarios = { ...prev, [dia]: copiaDia };

 

   const validados = detectarSolapamientos(nuevosHorarios);
   return validados;

  });
};




		const haySolapamientoConBloque = (bloques, indexActual, horaInicio, horaFin) => {
		  const inicioActual = new Date(`2020-01-01T${horaInicio}:00`);
		  const finActual = new Date(`2020-01-01T${horaFin}:00`);

		  for (let i = 0; i < bloques.length; i++) {
			if (i === indexActual) continue;
			const otro = bloques[i];
			if (!otro.horaInicio || !otro.horaTermino) continue;
			const iniOtro = new Date(`2020-01-01T${otro.horaInicio}:00`);
			const finOtro = new Date(`2020-01-01T${otro.horaTermino}:00`);

			if (inicioActual < finOtro && finActual > iniOtro) {
			  return true;
			}
		  }
		  return false;
		};


  // 9) Cambio de asignatura => cargar profes
  const handleAsignaturaChange = async (dia, index, valor) => {
    handleChangeBloque(dia, index, "asignatura", Number(valor) || 0);

    if (!selectedColegio || !valor) return;
    if (!profesoresPorAsignatura[valor]) {
      try {
        const resp = await axios.get(
          `http://localhost:5000/api/horarios/profesores/${selectedColegio}/asignatura/${valor}`
        );
        setProfesoresPorAsignatura((prev) => ({
          ...prev,
          [valor]: resp.data,
        }));
      } catch (error) {
        console.error("Error al obtener profesores:", error);
      }
    }
  };


const tipoDesdeDatos = ({ asignatura, profesor }) => {
  if (asignatura === "Recreo" || !profesor || profesor.toString().trim() === "") {
    return "Recreo";
  }
  return "Clase";
};

const obtenerBloqueDesdeTitle = (title) => {
  const match = title?.match(/\(Bloque(\d+)\)/);
  return match ? parseInt(match[1]) : null;
};

const haySolapamiento = (dia, indexActual, horaInicio, horaFin) => {
  if (!horaInicio || !horaFin) return false;

  const bloquesDelDia = horarios[dia];
  const inicioActual = new Date(`2020-01-01T${horaInicio}:00`);
  const finActual = new Date(`2020-01-01T${horaFin}:00`);

  for (let i = 0; i < bloquesDelDia.length; i++) {
    if (i === indexActual) continue;
    const otro = bloquesDelDia[i];
    if (!otro.horaInicio || !otro.horaTermino) continue;
    const iniOtro = new Date(`2020-01-01T${otro.horaInicio}:00`);
    const finOtro = new Date(`2020-01-01T${otro.horaTermino}:00`);

    if (inicioActual < finOtro && finActual > iniOtro) {
      return true;
    }
  }
  return false;
};


const eliminarBloque = async (dia, index) => {
  const confirmar = window.confirm("¿Estás seguro de que deseas eliminar este bloque?");
  if (!confirmar) return;

  const bloqueSeleccionado = horarios[dia][index];
  console.log("🧪 Eliminando bloque:", bloqueSeleccionado);


  if (!bloqueSeleccionado.scheduleId) {
    console.error("❌ No se puede eliminar: el bloque no tiene un scheduleId asignado.");
    alert("Error: el bloque no tiene ID asociado. Debes guardar antes de eliminar.");
    return;
  }

  try {
    if (bloqueSeleccionado.tipo === "Recreo") {
      await axios.delete(`http://localhost:5000/api/horarios/recreo/${bloqueSeleccionado.scheduleId}`);
    } else {
      await axios.delete(`http://localhost:5000/api/horarios/${bloqueSeleccionado.scheduleId}`);
    }
  } catch (err) {
    console.error("Error al eliminar en BD", err);
  }

 setHorarios((prev) => {
  const copia = { ...prev };
  copia[dia] = [...prev[dia]];
  copia[dia].splice(index, 1);

  // Recalcular número de bloque
  copia[dia] = copia[dia].map((bloque, idx) => ({
    ...bloque,
    numeroBloque: idx + 1
  }));

  // ✅ Recalcular solapamientos tras eliminar
  return detectarSolapamientos(copia);
});

};






  // Render
  return (
    <div className="contenedor">
      <h1 className="form-titulo">Gestión de Horarios</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* SELECCIÓN: Colegio, Cod.Enseñanza, Curso */}
      <div className="form-registrar-profesor">
        <div className="campo">
          <label>Colegio:</label>
          <select
            value={selectedColegio}
            onChange={manejarCambioColegio}
            disabled={colegioDisabled}
          >
            <option value="">Seleccione un colegio</option>
            {colegios.map((col) => (
              <option key={col.OrganizationId} value={col.OrganizationId}>
                {col.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Código Enseñanza:</label>
          <select
            value={selectedCodigoEnsenanza}
            onChange={manejarCambioCodigoEnsenanza}
            disabled={!selectedColegio}
          >
            <option value="">Seleccione un código</option>
            {codigoEnsenanza.map((ce) => (
              <option key={ce.OrganizationId} value={ce.OrganizationId}>
                {ce.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Curso:</label>
          <select
            value={selectedCurso}
            onChange={(e) => setSelectedCurso(e.target.value)}
            disabled={!selectedCodigoEnsenanza}
          >
            <option value="">Seleccione un curso</option>
            {cursos.map((c) => (
              <option key={c.Valor} value={c.Valor}>
                {c.Curso}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Panel de Acciones */}
      <div className="acciones-horarios">
        <div className="replicar-horarios">
          <h3>Calendario de referencia</h3>
          <label>Calendario:</label>
          <select
            value={calendarioSeleccionado}
            onChange={(e) => setCalendarioSeleccionado(e.target.value)}
          >
            <option value="">Seleccione un calendario</option>
            {calendarios.map((cal) => (
              <option key={cal.OrganizationCalendarSessionId} value={cal.OrganizationCalendarSessionId}>
                {cal.CalendarYear} -{" "}
                {cal.BeginDate?.split("T")[0]} al{" "}
                {cal.EndDate?.split("T")[0]}
              </option>
            ))}
          </select>
          <button onClick={cargarHorarios}>Cargar Horarios</button>
				 {calendarioSeleccionado && (
		  <button
			className="guardar-cambios"
			onClick={manejarGuardarCambios}
			style={{ marginTop: '1rem', background: 'green', color: 'white' }}
		  >
			Guardar cambios al calendario actual
		  </button>
		)}
		  
        </div>

        <div className="guardar-horarios">
          <h3>Guardar en nuevo calendario</h3>
		  <p className="leyenda-explicativa">
		  Esto creará un nuevo calendario con los bloques actuales. Asegúrese de ingresar un rango de fechas sin solapamientos.
		 </p>

          <div>
            <label>
              <input
                type="checkbox"
                checked={deHoyEnAdelante}
                onChange={(e) => setDeHoyEnAdelante(e.target.checked)}
              />
              De hoy en adelante
            </label>
          </div>
		  
         <>
			  <label>Fecha Inicio:</label>
			  <input
				type="date"
				value={
				  deHoyEnAdelante
					? new Date().toISOString().split("T")[0]
					: fechaInicio
				}
				onChange={(e) => setFechaInicio(e.target.value)}
				disabled={deHoyEnAdelante}
			  />

			  <label>Fecha Fin:</label>
			  <input
				type="date"
				value={fechaFin}
				onChange={(e) => setFechaFin(e.target.value)}
			  />
			</>

		  
          <button onClick={manejarGuardarHorarios}>Guardar en nuevo Calendario</button>
        </div>
      </div>

      {/* Las 5 columnas de la semana */}
      <div className="horario-semana">
        {DIAS_SEMANA.map((dia) => (
          <div className="dia" key={dia}>
            <h2>{dia}</h2>
            {horarios[dia].map((bloque, idx) => {
              const profesoresDeEstaAsig =
                profesoresPorAsignatura[bloque.asignatura] || [];
              const claseRecreo =
                bloque.tipo === "Recreo" ? "recreo" : "clase";

              return (
                <div className={`bloque-container ${claseRecreo} ${bloque.tieneSolape ? "bloque-error" : ""}`} key={idx}>
                  <h3>Bloque {idx + 1}
                  {" "}
                    {bloque.tipo !== "Recreo" && (

                    <>
                     {/* Icono de Asistencia */}
                      <span
  			title="Bloque contemplado en la asistencia diaria"
  			onClick={() => toggleAsistencia(dia, idx)}
  			className="icono-asistencia"
			>
  			<FaStar color={bloque.asistencia === true || bloque.asistencia === 1 ? "gold" : "lightgray"} 

                         size={24} // Puedes ajustar este número (por ejemplo: 24, 28, etc.)
                        />
                        
			</span>

                         {/* Icono de eliminación 
     			 <span
        			title="Eliminar este bloque"
        			onClick={() => eliminarBloque(dia, idx)}
        			
        			
      			>
        		<FaTrash className="icono-eliminar" size={20} />
      			</span>
                         */}

                    </>

                    )}

                     {/* Papelera para todos los tipos de bloque */}
  			<span
    			title="Eliminar este bloque"
    			onClick={() => eliminarBloque(dia, idx)}
  			>
    			<FaTrash className="icono-eliminar" size={20} />
                     </span>
            


                   </h3>

 <div className="campo">
 <label>Tipo Bloque:</label>
  <select
    key={`bloque-${dia}-${idx}`} // <-- esta línea es CLAVE para forzar el renderizado



    value={bloque.bloqueId !== null && bloque.bloqueId !== undefined ? String(bloque.bloqueId) : ""}
    onChange={(e) =>
      handleChangeBloque(dia, idx, "bloqueId", Number(e.target.value))
    }
  >
    <option value="">Seleccione un bloque</option>
    {opcionesBloques.map((op) => (
      <option key={op.id} value={String(op.id)}>
        {op.nombre}
      </option>
    ))}
  </select>
</div>


                  <div className="campo">
                    <label>Hora de inicio:</label>
                    <input
                      type="time"
                      value={bloque.horaInicio || ""}
                      onChange={(e) =>
                        handleChangeBloque(dia, idx, "horaInicio", e.target.value)
                      }
                    />
                  </div>

                  <div className="campo">
                    <label>Hora de término:</label>
                    <input
                      type="time"
                      value={bloque.horaTermino || ""}
                      onChange={(e) =>
                        handleChangeBloque(dia, idx, "horaTermino", e.target.value)
                      }
                    />
                  </div>

                  {bloque.tipo !== "Recreo" && (
                    <>
                      <div className="campo">
                        <label>Asignatura:</label>
                        <select
                          value={bloque.asignatura || ""}
                          onChange={(e) =>
                            handleAsignaturaChange(dia, idx, e.target.value)
                          }
                        >
                          <option value="">Seleccione asignatura</option>
                          {asignaturas.map((asg) => (
                            <option
                              key={asg.AsignaturaId}
                              value={asg.AsignaturaId}
                            >
                              {asg.AsignaturaName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="campo">
                        <label>Profesor:</label>
                        <select
                          value={bloque.profesor || ""}
                          onChange={(e) =>
                            handleChangeBloque(
                              dia,
                              idx,
                              "profesor",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Seleccione profesor</option>
                          {profesoresDeEstaAsig.map((prof) => (
                            <option
                              key={prof.ProfesorId}
                              value={prof.ProfesorId}
                            >
                              {prof.ProfesorNombre}
                            </option>
                          ))}
                        </select>
                      </div>
                     </>
                  )}
				  
				  {bloque.tieneSolape && (
					<p className="mensaje-solape">⚠️ Este bloque se solapa con otro. Corrige las horas.</p>
					)}

				  
                </div>
              );
            })}

            <button
              className="btn-agregar-bloque"
              onClick={() => agregarNuevoBloque(dia)}
            >
              Agregar nuevo bloque
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GestionHorariosIntegrado;

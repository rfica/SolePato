import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/horarios.css";

const DiaHorario = ({ dia, horarios, setHorarios, colegioId, cursoId }) => {
  const [bloques, setBloques] = useState([]);
  const [opcionesBloques, setOpcionesBloques] = useState([]);
  const [profesoresPorBloque, setProfesoresPorBloque] = useState({});
  const [asignaturas, setAsignaturas] = useState([]);

  /** 🔹 Cargar asignaturas **/
  useEffect(() => {
    if (!cursoId) return;
    const fetchAsignaturas = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/horarios/asignaturas/curso/${cursoId}`
        );
        setAsignaturas(response.data || []);
      } catch (error) {
        console.error("❌ Error al cargar asignaturas:", error);
      }
    };
    fetchAsignaturas();
  }, [cursoId]);



useEffect(() => {
    if (!horarios || !horarios[dia] || opcionesBloques.length === 0) return;

    console.log("📌RF1 Datos recibidos para el día:", dia, horarios[dia]);

    if (bloques.length > 0) return;

    const nuevosBloques = horarios[dia].map((bloque) => {
        console.log("📌RF2 Bloque recibido:", bloque);

        // 🔹 Calcular la duración en minutos
        const [horaInicio, minInicio] = bloque.horaInicio.split(":").map(Number);
        const [horaFin, minFin] = bloque.horaFin.split(":").map(Number);
        const duracion = (horaFin * 60 + minFin) - (horaInicio * 60 + minInicio);

        // 🔹 Normalizar el tipo de bloque para la búsqueda
        let tipoNormalizado = bloque.tipo === "Clase" ? "Clases" : bloque.tipo;

        // 🔹 Buscar el bloque correcto basado en la duración y el tipo
        const bloqueEncontrado = opcionesBloques.find(b => b.duracion === duracion && b.tipo === tipoNormalizado);

        console.log(`📌 Duración: ${duracion} min | Tipo: ${tipoNormalizado} | Bloque asignado: ${bloqueEncontrado ? bloqueEncontrado.nombre : "No encontrado"}`);

        return {
            bloque: bloqueEncontrado ? bloqueEncontrado.nombre : "", // 🔹 Asignar bloque correcto
            tipo: bloque.tipo || "Clase",
            asignatura: Array.isArray(bloque.asignaturaId) ? bloque.asignaturaId[0] : bloque.asignaturaId || "",
            profesor: Array.isArray(bloque.profesorId) ? bloque.profesorId[0] : bloque.profesorId || "",
            horaInicio: bloque.horaInicio || "",
            horaTermino: bloque.horaFin || "",
        };
    });

    console.log("📌RF5 Bloques procesados:", nuevosBloques);
    setBloques(nuevosBloques);
}, [horarios, dia, opcionesBloques]);  // 🔹 Se asegura que espere a `opcionesBloques`





  /** 🔹 Cargar opciones de bloques **/
  useEffect(() => {
    const fetchBloques = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/bloques");
        setOpcionesBloques(response.data || []);
      } catch (error) {
        console.error("❌ Error al cargar los bloques:", error);
      }
    };
    fetchBloques();
  }, []);

  /** 🔹 Cargar profesores cuando se selecciona una asignatura **/
  useEffect(() => {
    if (!colegioId || bloques.length === 0) return;
    const cargarProfesores = async () => {
      const nuevosProfesores = {};
      for (let index = 0; index < bloques.length; index++) {
        let bloque = bloques[index];
        if (bloque.asignatura && bloque.tipo !== "Recreo") {
          try {
            const response = await axios.get(
              `http://localhost:5000/api/horarios/profesores/${colegioId}/asignatura/${bloque.asignatura}`
            );
            nuevosProfesores[bloque.asignatura] = response.data;
          } catch (error) {
            console.error("❌ Error al obtener los profesores:", error);
          }
        }
      }
      setProfesoresPorBloque(nuevosProfesores);
    };
    cargarProfesores();
  }, [colegioId, bloques]);

const handleChangeBloque = (index, campo, valor) => {
    setBloques(prevBloques => {
        const nuevosBloques = [...prevBloques];
        nuevosBloques[index][campo] = valor;

        // 🔹 Si se selecciona un bloque, obtener su duración desde opcionesBloques
        if (campo === "bloque") {
            console.log(`📌 Valor seleccionado en el listbox de "Bloque":`, valor);
            
            const bloqueSeleccionado = opcionesBloques.find(b => b.nombre === valor);
            
            if (bloqueSeleccionado) {
                console.log(`📌 Duración del bloque seleccionado:`, bloqueSeleccionado.duracion);
                nuevosBloques[index]["duracion"] = bloqueSeleccionado.duracion;
                nuevosBloques[index]["tipo"] = bloqueSeleccionado.tipo;

                // 🔹 Si es un recreo, eliminar asignatura y profesor
                if (bloqueSeleccionado.tipo === "Recreo") {
                    nuevosBloques[index]["asignatura"] = "";
                    nuevosBloques[index]["profesor"] = "";
                }
            } else {
                console.warn("⚠️ No se encontró duración para el bloque seleccionado.");
            }

            // 🔹 Si ya tiene una hora de inicio, calcular la hora de término automáticamente
            if (nuevosBloques[index]["horaInicio"]) {
                let [hora, minutos] = nuevosBloques[index]["horaInicio"].split(":").map(num => parseInt(num, 10));

                minutos += bloqueSeleccionado.duracion; // 🔹 Sumar la duración obtenida

                if (minutos >= 60) {  
                    hora += Math.floor(minutos / 60); // 🔹 Ajustar la hora si se pasa de 60 min
                    minutos = minutos % 60; 
                }

                // 🔹 Formatear la nueva hora de término a formato HH:MM
                const nuevaHoraTermino = `${hora.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
                nuevosBloques[index]["horaTermino"] = nuevaHoraTermino;

                console.log(`📌 Nueva hora de término calculada:`, nuevaHoraTermino);
            }
        }

        // 🔹 Si se cambia la hora de inicio, calcular la hora de término automáticamente
        if (campo === "horaInicio") {
            const bloqueActual = nuevosBloques[index];
            const bloqueSeleccionado = opcionesBloques.find(b => b.nombre === bloqueActual.bloque);

            if (bloqueSeleccionado && bloqueSeleccionado.duracion) {
                let [hora, minutos] = valor.split(":").map(num => parseInt(num, 10));

                minutos += bloqueSeleccionado.duracion; // 🔹 Sumar la duración obtenida

                if (minutos >= 60) {  
                    hora += Math.floor(minutos / 60); // 🔹 Ajustar la hora si se pasa de 60 min
                    minutos = minutos % 60; 
                }

                // 🔹 Formatear la nueva hora de término a formato HH:MM
                const nuevaHoraTermino = `${hora.toString().padStart(2, "0")}:${minutos.toString().padStart(2, "0")}`;
                nuevosBloques[index]["horaTermino"] = nuevaHoraTermino;

                console.log(`📌 Nueva hora de término calculada:`, nuevaHoraTermino);
            } else {
                console.warn("⚠️ No se pudo calcular la hora de término. Asegúrate de seleccionar un bloque con duración.");
            }
        }

        // 🔹 Si es un bloque posterior, asignar la hora de inicio en base al bloque anterior
        if (index > 0 && !nuevosBloques[index]["horaInicio"]) {
            nuevosBloques[index]["horaInicio"] = nuevosBloques[index - 1]["horaTermino"];
            console.log(`📌 Nueva hora de inicio asignada para bloque ${index + 1}: ${nuevosBloques[index]["horaInicio"]}`);
        }

        return [...nuevosBloques];  // 🔹 Retornar una nueva referencia para que React lo detecte
    });

    // 🔹 Aplicar `setHorarios` correctamente para evitar que se sobrescriba
    setHorarios(prevHorarios => ({
        ...prevHorarios,
        [dia]: bloques.map(bloque => ({ ...bloque })), // Se actualiza con una copia de los bloques
    }));
    console.log(`✅ Estado de horarios actualizado:`, bloques);
};



  /** 🔹 Agregar un nuevo bloque sin perder los datos previos **/
  const handleAgregarBloque = () => {
    const ultimoBloque = bloques[bloques.length - 1] || { horaTermino: "08:00" };

    const nuevoBloque = {
        bloque: "",
        tipo: "Clase",
        horaInicio: ultimoBloque.horaTermino,  // La hora de inicio será la de término del último bloque
        horaTermino: "",
        asignatura: "",
        profesor: "",
        duracion: 0,  // Duración por defecto
        classMeetingDays: dia,
    };

    setBloques(prevBloques => [...prevBloques, nuevoBloque]);
};


  return (
    <div className="dia-horario">
      <h2>{dia}</h2>
      {bloques.map((bloque, index) => (
        <div key={index} className={`bloque-container ${bloque.tipo === "Recreo" ? "recreo" : "clase"}`}>
          <h3>{`Bloque ${index + 1}`}</h3>
          <div className="campo">
            <label>Bloque:</label>
            <select 
              value={bloque.bloque}
              onChange={(e) => handleChangeBloque(index, "bloque", e.target.value)}
            >
              <option value="">Seleccione un bloque</option>
              {opcionesBloques.map((op) => (
                <option key={op.id} value={op.nombre}>{op.nombre}</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label>Hora de inicio:</label>
            <input 
              type="time" 
              value={bloque.horaInicio} 
              onChange={(e) => handleChangeBloque(index, "horaInicio", e.target.value)}
            />
          </div>
          <div className="campo">
            <label>Hora de término:</label>
            <input 
              type="time" 
              value={bloque.horaTermino} 
              onChange={(e) => handleChangeBloque(index, "horaTermino", e.target.value)}
            />
          </div>


{bloque.tipo !== "Recreo" ? (
  <>
    <div className="campo">
      <label>Asignatura:</label>
      <select 
        value={bloque.asignatura}
        onChange={(e) => handleChangeBloque(index, "asignatura", e.target.value)}
      >
        <option value="">Seleccione una asignatura</option>
        {asignaturas.map((asignatura) => (
          <option key={asignatura.AsignaturaId} value={asignatura.AsignaturaId}>
            {asignatura.AsignaturaName}
          </option>
        ))}
      </select>
    </div>
    <div className="campo">
      <label>Profesor:</label>
      <select 
        value={bloque.profesor}
        onChange={(e) => handleChangeBloque(index, "profesor", e.target.value)}
      >
        <option value="">Seleccione un profesor</option>
        {profesoresPorBloque[bloque.asignatura]?.map((profesor) => (
          <option key={profesor.ProfesorId} value={profesor.ProfesorId}>
            {profesor.ProfesorNombre}
          </option>
        ))}
      </select>
    </div>
  </>
) : (
  <div className="bloque-recreo">
    <strong>Recreo de {bloque.duracion} minutos</strong>
  </div>
)}


        </div>
      ))}
      <button className="btn-agregar-bloque" onClick={handleAgregarBloque}>
        Agregar nuevo bloque
      </button>
    </div>
  );
};

export default DiaHorario;

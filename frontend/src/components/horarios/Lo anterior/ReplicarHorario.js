import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReplicarHorario = ({ selectedColegio, cursoOrganizationId, setHorarios }) => {
  const [calendarios, setCalendarios] = useState([]); // Almacena los calendarios disponibles
  const [calendarioSeleccionado, setCalendarioSeleccionado] = useState(''); // Guarda el OrganizationCalendarSessionId

  useEffect(() => {
    console.log("📌 cursoOrganizationId recibido en ReplicarHorario:", cursoOrganizationId);
    
    if (!cursoOrganizationId) {
        console.log("❌ cursoOrganizationId no está definido en ReplicarHorario");
        return;
    }

    console.log("✅ Haciendo solicitud con cursoOrganizationId:", cursoOrganizationId);
    
    const fetchCalendarios = async () => {
        try {
            const response = await axios.get(`http://localhost:5000/api/horarios/getanos/${cursoOrganizationId}`);
            console.log("✅ Datos recibidos de la API:", response.data);

            if (response.data && response.data.length > 0) {
                setCalendarios(response.data);
            } else {
                setCalendarios([]);
            }
        } catch (error) {
            console.error("❌ Error al cargar los calendarios:", error);
            setCalendarios([]);
        }
    };

    fetchCalendarios();
}, [cursoOrganizationId]); // Escucha cambios en cursoOrganizationId



  const cargarHorarios = async () => {
    if (!calendarioSeleccionado || !cursoOrganizationId) {
        alert('Seleccione un calendario y un curso para cargar los horarios.');
        return;
    }

    try {
        const response = await axios.get(
            `http://localhost:5000/api/horarios/detalle/${cursoOrganizationId}/${calendarioSeleccionado}?timestamp=${new Date().getTime()}`
        );

        console.log("✅ Horarios obtenidos:", response.data);

        if (!response.data || response.data.length === 0) {
            alert("No hay horarios para este curso.");
            return;
        }

      console.log("📌 Horarios cargados desde la BD:", JSON.stringify(nuevosHorarios, null, 2));


        // 🔥 Solución: asegurar que el estado se actualiza correctamente
        setHorarios(prevHorarios => {
            const nuevosHorarios = { ...prevHorarios };
            
            response.data.forEach(horario => {
                if (!nuevosHorarios[horario.dias]) {
                    nuevosHorarios[horario.dias] = [];
                }
                nuevosHorarios[horario.dias].push(horario);
            });

            return { ...nuevosHorarios };  // React detectará el cambio en el estado
        });

    } catch (error) {
        console.error("❌ Error al cargar los horarios:", error);
    }
};



  return (
    <div className="replicar-horarios">
      <h3>Replicar Horarios</h3>
      <label>Calendario:</label>
      <select value={calendarioSeleccionado} onChange={(e) => setCalendarioSeleccionado(e.target.value)}>
        <option value="">Seleccione un calendario</option>
        {calendarios.length > 0 ? (
          calendarios.map((calendario, index) => (
           	<option key={index} value={calendario.OrganizationCalendarSessionId}>
   		 {calendario.CalendarYear} - 
    		 {calendario.BeginDate && typeof calendario.BeginDate === "string" ? calendario.BeginDate.split("T")[0] : 'Fecha no disponible'} al 
   		 {calendario.EndDate && typeof calendario.EndDate === "string" ? calendario.EndDate.split("T")[0] : 'Fecha no disponible'}
		</option>


          ))
        ) : (
          <option value="">No hay calendarios disponibles</option>
        )}
      </select>
      <button onClick={cargarHorarios}>Cargar Horarios</button>
    </div>
  );
};

export default ReplicarHorario;

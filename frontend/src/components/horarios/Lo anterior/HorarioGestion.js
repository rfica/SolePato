// HorarioGestion.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './estilosgenerales.css'; // Usaremos los estilos generales existentes

const HorarioGestion = ({ cursoId, codigoEnsenanzaId }) => {
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = useState([]);
    const [anioSeleccionado, setAnioSeleccionado] = useState('');
    const [horarioSeleccionado, setHorarioSeleccionado] = useState('');
    const [rangoValidez, setRangoValidez] = useState({ desde: '', hasta: '' });

    useEffect(() => {
        // Cargar los años disponibles para replicar
        const fetchAnios = async () => {
            try {
                const response = await axios.get(`/api/horarios/available-years/${cursoId}`);
                setAniosDisponibles(response.data);
            } catch (error) {
                console.error('Error al cargar los años disponibles:', error);
            }
        };
        fetchAnios();
    }, [cursoId]);

    const handleReplicarHorarios = async () => {
         if (!anioSeleccionado || !horarioSeleccionado || !cursoId || !codigoEnsenanzaId) {
        alert('Debe seleccionar un año, un horario y un curso válido para replicar.');
        return;
    }

        try {
            const response = await axios.post('/api/horarios/replicate', {
                cursoId,
                codigoEnsenanzaId,
                anioSeleccionado,
                horarioId: horarioSeleccionado,
            });
            alert(response.data.message);
        } catch (error) {
            console.error('Error al replicar horarios:', error);
            alert('Hubo un error al replicar los horarios.');
        }
    };

    const handleGuardarHorarios = async () => {
        if (!rangoValidez.desde || !rangoValidez.hasta) {
            alert('Debe completar el rango de validez.');
            return;
        }

        try {
            const response = await axios.post('/api/horarios/bulk', {
                cursoId,
                codigoEnsenanzaId,
                rangoValidez,
                horarios: [] // Aquí deberíamos enviar los horarios configurados
            });
            alert(response.data.message);
        } catch (error) {
            console.error('Error al guardar horarios:', error);
            alert('Hubo un error al guardar los horarios.');
        }
    };

    const cargarHorarios = async (anio) => {
    if (!cursoId) {
        console.error("⚠️ Error: cursoId no está definido.");
        return;
    }

    try {
        const response = await axios.get(`/api/horarios/by-year/${cursoId}/${anio}`);
        setHorariosDisponibles(response.data);
    } catch (error) {
        console.error('Error al cargar horarios:', error);
    }
};


    return (
        <div className="horario-gestion">
            <div className="replicar-horarios">
                <h3>Replicar Horarios</h3>
                <select onChange={(e) => {
                    setAnioSeleccionado(e.target.value);
                    cargarHorarios(e.target.value);
                }}>
                    <option value="">Seleccione un año</option>
                    {aniosDisponibles.map((anio) => (
                        <option key={anio} value={anio}>{anio}</option>
                    ))}
                </select>

                <select onChange={(e) => setHorarioSeleccionado(e.target.value)}>
                    <option value="">Seleccione un horario</option>
                    {horariosDisponibles.map((horario) => (
                        <option key={horario.id} value={horario.id}>{horario.nombre}</option>
                    ))}
                </select>

                <button onClick={handleReplicarHorarios}>Cargar Horario</button>
            </div>

            <div className="guardar-horarios">
                <h3>Guardar Horarios</h3>
                <div>
                    <label>Desde:</label>
                    <input
                        type="date"
                        value={rangoValidez.desde}
                        onChange={(e) => setRangoValidez({ ...rangoValidez, desde: e.target.value })}
                    />
                </div>
                <div>
                    <label>Hasta:</label>
                    <input
                        type="date"
                        value={rangoValidez.hasta}
                        onChange={(e) => setRangoValidez({ ...rangoValidez, hasta: e.target.value })}
                    />
                </div>

                <button onClick={handleGuardarHorarios}>Guardar Horarios</button>
            </div>
        </div>
    );
};

export default HorarioGestion;

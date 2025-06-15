import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HorarioSemana from './HorarioSemana';
import ReplicarHorario from './ReplicarHorario'; // Importación corregida
import GuardarHorario from './GuardarHorario';   // Importación corregida

import '../../styles/horarios.css';

const Horarios = () => {
    const [colegios, setColegios] = useState([]);
    const [codigoEnsenanza, setCodigoEnsenanza] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [selectedColegio, setSelectedColegio] = useState('');
    const [selectedCodigoEnsenanza, setSelectedCodigoEnsenanza] = useState('');
    const [selectedCurso, setSelectedCurso] = useState('');
    const [horarios, setHorarios] = useState({
        Lunes: [],
        Martes: [],
        Miércoles: [],
        Jueves: [],
        Viernes: [],
    });
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        fetchColegios();
    }, []);

    const fetchColegios = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/obtener-colegios');
            setColegios(response.data);
        } catch (error) {
            console.error('Error al obtener los colegios:', error);
            setErrorMessage('Error al cargar los colegios. Intente nuevamente.');
        }
    };

    const fetchCodigosEnsenanza = async (colegioId) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/horarios/codense/${colegioId}`);
            setCodigoEnsenanza(response.data);
        } catch (error) {
            console.error('Error al obtener los códigos de enseñanza:', error);
            setErrorMessage('Error al cargar los códigos de enseñanza.');
        }
    };

    const fetchCursos = async (codigoEnsenanzaId) => {
        try {
            const response = await axios.get(`http://localhost:5000/api/horarios/cursos/${codigoEnsenanzaId}`);
            setCursos(response.data);
        } catch (error) {
            console.error('Error al obtener los cursos:', error);
            setErrorMessage('Error al cargar los cursos.');
        }
    };

    const manejarCambioColegio = (e) => {
        const colegioId = e.target.value;
        setSelectedColegio(colegioId);
        setSelectedCodigoEnsenanza('');
        setSelectedCurso('');
        setHorarios({ Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] });

        if (colegioId) {
            fetchCodigosEnsenanza(colegioId);
        } else {
            setCodigoEnsenanza([]);
            setCursos([]);
        }
    };

    const manejarCambioCodigoEnsenanza = (e) => {
        const codigoId = e.target.value;
        setSelectedCodigoEnsenanza(codigoId);
        setSelectedCurso('');
        setHorarios({ Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] });

        if (codigoId) {
            fetchCursos(codigoId);
        } else {
            setCursos([]);
        }
    };

    // Obtener el nombre del curso seleccionado
    const cursoNombre = cursos.find((curso) => curso.Valor === selectedCurso)?.Curso || '';

    // Obtener el ID del curso (parte derecha del guion)
    const cursoId = selectedCurso.includes('-') ? selectedCurso.split('-')[1].trim() : selectedCurso;

  		const cursoSeleccionado = cursos.find((curso) => curso.Valor === selectedCurso);
                const cursoOrganizationId = cursoSeleccionado ? cursoSeleccionado.Valor.split('-')[1] : null;



		console.log("✅ cursoOrganizationId obtenido en Horarios.js:", cursoOrganizationId);
                console.log("✅ cursoSeleccionado  obtenido en Horarios.js:", cursoSeleccionado );



    return (
        <div className="contenedor">
            <h1 className="form-titulo">Gestión de Horarios</h1>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <div className="form-registrar-profesor">
                <div className="campo">
                    <label htmlFor="colegio">Colegio:</label>
                    <select
                        id="colegio"
                        value={selectedColegio}
                        onChange={manejarCambioColegio}
                        className="input"
                    >
                        <option value="">Seleccione un colegio</option>
                        {colegios.map((colegio) => (
                            <option key={colegio.OrganizationId} value={colegio.OrganizationId}>
                                {colegio.Name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="campo">
                    <label htmlFor="codigoEnsenanza" className="label-codigo-ensenanza">Código Enseñanza:</label>
                    <select
                        id="codigoEnsenanza"
                        value={selectedCodigoEnsenanza}
                        onChange={manejarCambioCodigoEnsenanza}
                        className="input"
                        disabled={!selectedColegio}
                    >
                        <option value="">Seleccione un código de enseñanza</option>
                        {codigoEnsenanza.map((codigo) => (
                            <option key={codigo.OrganizationId} value={codigo.OrganizationId}>
                                {codigo.Name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="campo">
                    <label htmlFor="curso">Curso:</label>
                    <select
                        id="curso"
                        value={selectedCurso}
                        onChange={(e) => setSelectedCurso(e.target.value)}
                        className="input"
                        disabled={!selectedCodigoEnsenanza}
                    >
                        <option value="">Seleccione un curso</option>
                        {cursos.map((curso) => (
                            <option key={curso.Valor} value={curso.Valor}>
                                {curso.Curso}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="acciones-horarios">
                <ReplicarHorario 
                    selectedColegio={selectedColegio} 
                    cursoOrganizationId={cursoOrganizationId} // ✅ Pasamos la nueva variable
                    selectedCurso={selectedCurso} 
                    setHorarios={setHorarios} 
                   

                />
                <GuardarHorario 
                    horarios={horarios} 
                    selectedColegio={selectedColegio} 
                    cursoId={cursoId} // Pasamos el ID del curso (parte derecha del guion)
                    cursoNombre={cursoNombre} // Se pasa el nombre del curso adicionalmente
                />
            </div>

            {selectedCurso && (
                <HorarioSemana 
                    horarios={horarios} 
                    setHorarios={setHorarios} 
                    colegioId={selectedColegio} 
                    cursoId={cursoId} // ✅ Agregar esta línea  Deep Seek
                />
            )}
        </div>
    );
};

export default Horarios;

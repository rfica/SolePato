// Archivo: HorarioSemana.js
import React from 'react';
import DiaHorario from './DiaHorario';
import '../../styles/HorarioSemana.css'; // Ajustado para ruta válida

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const HorarioSemana = ({ horarios, setHorarios, colegioId, cursoId }) => {
    return (
        <div className="horario-semana">
            {dias.map((dia) => (
                <div key={dia} className="dia">
                    <DiaHorario dia={dia} horarios={horarios} setHorarios={setHorarios} colegioId={colegioId} cursoId={cursoId}/>
                </div>
            ))}
        </div>
    );
};

export default HorarioSemana;

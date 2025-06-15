import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/estilosgenerales.css';

const Bloques = () => {
    const [bloques, setBloques] = useState([]);
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('Recreo');
    const [duracion, setDuracion] = useState('');
    const [modoEdicion, setModoEdicion] = useState(false);
    const [idEdicion, setIdEdicion] = useState(null);

    useEffect(() => {
        obtenerBloques();
    }, []);

    const obtenerBloques = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/bloques');
            if (response.data) {
                setBloques(response.data);
            } else {
                console.error('No se encontraron datos en la respuesta.');
            }
        } catch (error) {
            console.error('Error al obtener los bloques:', error);
        }
    };

    const manejarGuardar = async () => {
        if (!nombre || !duracion) {
            alert('Por favor, complete todos los campos.');
            return;
        }

        const nuevoBloque = { nombre, tipo, duracion };

        try {
            if (modoEdicion) {
                await axios.put(`http://localhost:5000/api/bloques/${idEdicion}`, nuevoBloque);
                alert('Bloque actualizado correctamente.');
            } else {
                await axios.post('http://localhost:5000/api/bloques', nuevoBloque);
                alert('Bloque creado correctamente.');
            }
            limpiarFormulario();
            obtenerBloques();
        } catch (error) {
            console.error('Error al guardar el bloque:', error);
            alert(`Error al guardar el bloque: ${error.response?.data?.message || error.message}`);
        }
    };

    const manejarEliminar = async (id) => {
        if (window.confirm('¿Está seguro de que desea eliminar este bloque?')) {
            try {
                await axios.delete(`http://localhost:5000/api/bloques/${id}`);
                alert('Bloque eliminado correctamente.');
                obtenerBloques();
            } catch (error) {
                console.error('Error al eliminar el bloque:', error);
                alert('Error al eliminar el bloque.');
            }
        }
    };

    const manejarEditar = (bloque) => {
        setModoEdicion(true);
        setIdEdicion(bloque.id);
        setNombre(bloque.nombre);
        setTipo(bloque.tipo);
        setDuracion(bloque.duracion);
    };

    const limpiarFormulario = () => {
        setModoEdicion(false);
        setIdEdicion(null);
        setNombre('');
        setTipo('Recreo');
        setDuracion('');
    };

    return (
        <div className="contenedor">
            <h1 className="form-titulo">Gestión de Bloques</h1>

            <button
                className="button"
                onClick={() => limpiarFormulario()}
            >
                Bloque Nuevo
            </button>

            <table className="curso-tabla">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Tipo de Bloque</th>
                        <th>Duración</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {bloques.map((bloque) => (
                        <tr key={bloque.id}>
                            <td>{bloque.nombre}</td>
                            <td>{bloque.tipo}</td>
                            <td>{bloque.duracion} min</td>
                            <td>
                                <button
                                    className="button"
                                    onClick={() => manejarEditar(bloque)}
                                >
                                    Editar
                                </button>
                                <button
                                    className="button"
                                    onClick={() => manejarEliminar(bloque.id)}
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="form-registrar-profesor">
                <h2>{modoEdicion ? 'Editar Bloque' : 'Crear Bloque'}</h2>

                <div>
                    <label>Nombre:</label>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: Tipo bloque 1"
                        className="input"
                    />
                </div>

                <div>
                    <label>Tipo de Bloque:</label>
                    <div>
                        <label>
                            <input
                                type="radio"
                                value="Recreo"
                                checked={tipo === 'Recreo'}
                                onChange={(e) => setTipo(e.target.value)}
                            />
                            Recreo
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="Clases"
                                checked={tipo === 'Clases'}
                                onChange={(e) => setTipo(e.target.value)}
                            />
                            Clases
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="Electivo"
                                checked={tipo === 'Electivo'}
                                onChange={(e) => setTipo(e.target.value)}
                            />
                            Electivo
                        </label>
                        <label>
                            <input
                                type="radio"
                                value="Taller"
                                checked={tipo === 'Taller'}
                                onChange={(e) => setTipo(e.target.value)}
                            />
                            Taller
                        </label>
                    </div>
                </div>

                <div>
                    <label>Duración (minutos):</label>
                    <input
                        type="number"
                        value={duracion}
                        onChange={(e) => setDuracion(e.target.value)}
                        placeholder="Ej: 45"
                        className="input"
                    />
                </div>

                <div className="botones-formulario">
                    <button className="button" onClick={manejarGuardar}>
                        {modoEdicion ? 'Guardar Cambios' : 'Guardar'}
                    </button>
                    <button className="button" onClick={limpiarFormulario}>
                        Volver
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Bloques;

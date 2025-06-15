import React, { useState, useEffect } from 'react';
import '../styles/estilosgenerales.css'; // Asegúrate de que la ruta sea correcta

function RegistrarProfesor() {
  const [profesor, setProfesor] = useState({
    nombreUsuario: '',
    clave: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    celular: '',
    universidad: '',
    tituloUniversitario: '',
    fechaTitulacion: '',
    sexo: '', // Cambiará a ID numérico (1: Hombre, 2: Mujer, 3: No seleccionado)
    rut: '',
    correo: '',
    telefonoFijo: '',
    rol: '', // Cambiará a ID numérico (5: Docente, 11: Personal administrativo)
    colegio: '' // Aquí almacenaremos el ID del colegio seleccionado
  });

  const [errors, setErrors] = useState({});
  const [colegios, setColegios] = useState([]);

  // Función para obtener la lista de colegios
  useEffect(() => {
    async function fetchColegios() {
      try {
        const response = await fetch('http://localhost:5000/api/obtener-colegios'); // Endpoint para obtener los colegios
        const data = await response.json();
        setColegios(data); // Almacena la lista de colegios
      } catch (error) {
        console.error('Error al obtener colegios:', error);
      }
    }
    fetchColegios();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'direccion' && value.length > 40) {
      setErrors({
        ...errors,
        direccion: 'La dirección no puede tener más de 40 caracteres.'
      });
    } else {
      setErrors({
        ...errors,
        direccion: ''
      });
    }

    setProfesor({
      ...profesor,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (profesor.direccion.length > 40) {
      setErrors({
        ...errors,
        direccion: 'La dirección no puede tener más de 40 caracteres.'
      });
      alert('Por favor, corrige los errores en el formulario antes de enviar.');
      return;
    }

    const profesorData = {
      ...profesor,
      sexo: profesor.sexo === 'Hombre' ? 1 : profesor.sexo === 'Mujer' ? 2 : 3,
      rol: profesor.rol === 'Docente' ? 5 : 11,
      colegio: profesor.colegio // Incluye el ID del colegio seleccionado
    };

    try {
      const response = await fetch('http://localhost:5000/api/registrar-profesor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profesorData),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Profesor registrado exitosamente');
      } else {
        alert(`Error al registrar profesor: ${result.error}`);
      }

    } catch (error) {
      console.error('Error al registrar profesor:', error);
      alert('Hubo un error al registrar el profesor.');
    }
  };

  return (
    <>
      <h2 className="form-titulo">Registrar Profesores y Usuarios</h2>

      <form onSubmit={handleSubmit} className="form-registrar-profesor">
        <div>
          <label>Nombre usuario:</label>
          <input type="text" name="nombreUsuario" value={profesor.nombreUsuario} onChange={handleChange} required />
        </div>

        <div>
          <label>Clave:</label>
          <input type="password" name="clave" value={profesor.clave} onChange={handleChange} required />
        </div>

        <div>
          <label>Nombres:</label>
          <input type="text" name="nombres" value={profesor.nombres} onChange={handleChange} required />
        </div>

        <div>
          <label>Apellido Paterno:</label>
          <input type="text" name="apellidoPaterno" value={profesor.apellidoPaterno} onChange={handleChange} required />
        </div>

        <div>
          <label>Apellido Materno:</label>
          <input type="text" name="apellidoMaterno" value={profesor.apellidoMaterno} onChange={handleChange} required />
        </div>

        <div>
          <label>Dirección:</label>
          <input
            type="text"
            name="direccion"
            value={profesor.direccion}
            onChange={handleChange}
            required
            maxLength="40"
          />
          {errors.direccion && <span className="error">{errors.direccion}</span>}
        </div>

        <div>
          <label>Celular:</label>
          <input type="text" name="celular" value={profesor.celular} onChange={handleChange} required />
        </div>

        <div>
          <label>Universidad:</label>
          <input type="text" name="universidad" value={profesor.universidad} onChange={handleChange} required />
        </div>

        <div>
          <label>Título Universitario:</label>
          <input type="text" name="tituloUniversitario" value={profesor.tituloUniversitario} onChange={handleChange} required />
        </div>

        <div>
          <label>Fecha Titulación:</label>
          <input type="date" name="fechaTitulacion" value={profesor.fechaTitulacion} onChange={handleChange} required />
        </div>

        <div className="radio-group">
          <label>Sexo:</label>
          <input type="radio" name="sexo" value="Hombre" onChange={handleChange} required /> Hombre
          <input type="radio" name="sexo" value="Mujer" onChange={handleChange} required /> Mujer
          <input type="radio" name="sexo" value="No seleccionado" onChange={handleChange} required /> No seleccionado
        </div>

        <div>
          <label>RUT:</label>
          <input type="text" name="rut" value={profesor.rut} onChange={handleChange} required />
        </div>

        <div>
          <label>Correo:</label>
          <input type="email" name="correo" value={profesor.correo} onChange={handleChange} required />
        </div>

        <div>
          <label>Teléfono Fijo:</label>
          <input type="text" name="telefonoFijo" value={profesor.telefonoFijo} onChange={handleChange} />
        </div>

        <div>
          <label>Rol:</label>
          <select name="rol" value={profesor.rol} onChange={handleChange} required>
            <option value="">Seleccione rol</option>
            <option value="Docente">Docente</option>
            <option value="Personal administrativo">Personal administrativo</option>
          </select>
        </div>

        {/* Listbox para seleccionar el colegio */}
        <div>
          <label>Colegio:</label>
          <select name="colegio" value={profesor.colegio} onChange={handleChange} required>
            <option value="">Seleccione colegio</option>
            {colegios.map((colegio) => (
              <option key={colegio.OrganizationId} value={colegio.OrganizationId}>
                {colegio.Name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit">Registrar</button>
      </form>
    </>
  );
}

export default RegistrarProfesor;

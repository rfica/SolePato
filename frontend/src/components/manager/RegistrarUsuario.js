import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RoleService from '../../services/RoleService';
import '../../styles/estilosgenerales.css';

const RegistrarUsuario = () => {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    clave: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    celular: '',
    universidad: '',
    tituloUniversitario: '',
    fechaTitulacion: '',
    sexo: '',
    rut: '',
    correo: '',
    telefonoFijo: '',
    rol: '',
    colegio: ''
  });
  const [mensaje, setMensaje] = useState('');
  const [nombreColegio, setNombreColegio] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/usuarios/roles')
      .then(res => {
        console.log('Roles recibidos:', res.data);
        setRoles(res.data);
      })
      .catch(() => setRoles([]));
    const usuario = RoleService.getUsuario();
    const colegioId = usuario?.SchoolId || usuario?.OrganizationId;
    if (usuario && colegioId) {
      setForm(f => ({ ...f, colegio: colegioId }));
      axios.get(`http://localhost:5000/api/usuarios/colegios/${colegioId}`)
        .then(res => {
          setNombreColegio(res.data.Name || res.data.Nombre || res.data.name || '');
        })
        .catch(() => setNombreColegio(''));
    }
  }, []);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/usuarios/registrar', form);
      setMensaje('Usuario registrado exitosamente.');
      setForm({
        clave: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', direccion: '', celular: '', universidad: '', tituloUniversitario: '', fechaTitulacion: '', sexo: '', rut: '', correo: '', telefonoFijo: '', rol: '', colegio: form.colegio
      });
    } catch (err) {
      setMensaje('Error al registrar usuario.');
      console.error('Error al registrar usuario:', err);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h2 className="form-titulo">Registrar Usuario</h2>
      {mensaje && <div className={mensaje.includes('exitosamente') ? 'success-message' : 'error-message'}>{mensaje}</div>}
      <form onSubmit={handleSubmit} className="form-registrar-profesor form-usuario-dos-columnas">
        <div className="form-col">
          <div className="form-row">
            <label htmlFor="clave">Clave:</label>
            <input id="clave" name="clave" type="password" value={form.clave} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="nombres">Nombres:</label>
            <input id="nombres" name="nombres" value={form.nombres} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="apellidoPaterno">Apellido paterno:</label>
            <input id="apellidoPaterno" name="apellidoPaterno" value={form.apellidoPaterno} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="apellidoMaterno">Apellido materno:</label>
            <input id="apellidoMaterno" name="apellidoMaterno" value={form.apellidoMaterno} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="direccion">Dirección:</label>
            <input id="direccion" name="direccion" value={form.direccion} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="celular">Celular:</label>
            <input id="celular" name="celular" value={form.celular} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="universidad">Universidad:</label>
            <input id="universidad" name="universidad" value={form.universidad} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="tituloUniversitario">Título universitario:</label>
            <input id="tituloUniversitario" name="tituloUniversitario" value={form.tituloUniversitario} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="fechaTitulacion">Fecha titulación:</label>
            <input id="fechaTitulacion" name="fechaTitulacion" type="date" value={form.fechaTitulacion} onChange={handleChange} />
          </div>
        </div>
        <div className="form-col">
          <div className="form-row">
            <label htmlFor="sexo">Sexo:</label>
            <select id="sexo" name="sexo" value={form.sexo} onChange={handleChange} required>
              <option value="">Seleccione sexo</option>
              <option value="1">Hombre</option>
              <option value="2">Mujer</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="rut">RUT:</label>
            <input id="rut" name="rut" value={form.rut} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="correo">Correo:</label>
            <input id="correo" name="correo" value={form.correo} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <label htmlFor="telefonoFijo">Teléfono fijo:</label>
            <input id="telefonoFijo" name="telefonoFijo" value={form.telefonoFijo} onChange={handleChange} />
          </div>
          <div className="form-row">
            <label htmlFor="rol">Rol:</label>
            <select id="rol" name="rol" value={form.rol} onChange={handleChange} required>
              <option value="">Seleccione rol</option>
              {roles.map(r => (
                <option key={r.RoleId} value={r.RoleId}>{r.Name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="colegio">Colegio:</label>
            <input id="colegio" name="colegio" value={form.colegio ? `${form.colegio} - ${nombreColegio}` : ''} disabled />
          </div>
        </div>
        <div className="form-row form-row-boton">
          <button type="submit">Registrar</button>
        </div>
      </form>
    </div>
  );
};

export default RegistrarUsuario; 
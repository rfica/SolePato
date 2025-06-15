// frontend/src/components/Login/Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import '../../styles/login.css';

const Login = () => {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/login', { rut, password });
      const { usuario } = res.data;
      if (!usuario) {
        setError('Credenciales inválidas');
        setLoading(false);
        return;
      }
      const storage = recordarme ? localStorage : sessionStorage;
      storage.setItem('usuario', JSON.stringify(usuario));
      //history.push('/matricula');
	  //window.location.href = '/matricula';
      window.location.href = '/datos-colegio';
 
	   
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError('Credenciales inválidas');
      } else {
        setError('Error de conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-background">
      <div className="login-card">
        <h2>Ingreso al Sistema</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="RUT"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={recordarme}
                onChange={(e) => setRecordarme(e.target.checked)}
              />{' '}
              Recordarme
            </label>
          </div>
          <button type="submit" disabled={loading} className="login-button">
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
          {error && <p className="login-error">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Login;

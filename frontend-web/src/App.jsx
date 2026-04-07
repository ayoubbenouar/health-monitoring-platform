import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE, getToken, parseResponse, getErrorMessage } from './api';

// ---------- Connexion ----------
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const runSubmit = useCallback(async () => {
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    if (!password) { setError('Veuillez saisir votre mot de passe.'); return; }
    setError('');
    flushSync(() => setLoading(true));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(getErrorMessage(data, 'Connexion impossible'));
      localStorage.setItem('token', data.access_token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Le serveur ne répond pas. Vérifiez que Docker est démarré (port 8080).');
      } else {
        setError(getErrorMessage({ error: err.message }, err.message));
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate]);

  const handleClick = () => {
    runSubmit();
  };

  return (
    <div className="page-auth">
      <div className="card card--form">
        <h1 className="card__title">Connexion</h1>
        <p className="card__subtitle">Accédez à votre tableau de bord santé.</p>
        <form onSubmit={(e) => { e.preventDefault(); runSubmit(); }} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" autoComplete="email" disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Mot de passe</label>
            <input id="login-password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" disabled={loading} />
          </div>
          {error && <div className="message message--error" role="alert">{error}</div>}
          <button type="button" className="btn btn--primary btn--block" disabled={loading} onClick={handleClick}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
          <p className="form-footer">
            Pas encore de compte ? <Link to="/register" className="link">S'inscrire</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// ---------- Inscription ----------
function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const runSubmit = useCallback(async () => {
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    if (!password) { setError('Veuillez saisir votre mot de passe.'); return; }
    setError('');
    flushSync(() => setLoading(true));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, role: 'patient' }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(getErrorMessage(data, 'Inscription impossible'));
      navigate('/login', { replace: true });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Le serveur ne répond pas. Vérifiez que Docker est démarré (port 8080).');
      } else {
        setError(getErrorMessage({ error: err.message }, err.message));
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, navigate]);

  const handleClick = () => runSubmit();

  return (
    <div className="page-auth">
      <div className="card card--form">
        <h1 className="card__title">Inscription</h1>
        <p className="card__subtitle">Créez un compte pour suivre vos paramètres de santé.</p>
        <form onSubmit={(e) => { e.preventDefault(); runSubmit(); }} noValidate>
          <div className="form-group">
            <label htmlFor="register-email">Email</label>
            <input id="register-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" autoComplete="email" disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="register-password">Mot de passe</label>
            <input id="register-password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" disabled={loading} />
          </div>
          {error && <div className="message message--error" role="alert">{error}</div>}
          <button type="button" className="btn btn--primary btn--block" disabled={loading} onClick={handleClick}>
            {loading ? 'Inscription en cours...' : "S'inscrire"}
          </button>
          <p className="form-footer">
            Déjà un compte ? <Link to="/login" className="link">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// ---------- Routes protégées ----------
function ProtectedRoute({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return children;
}

// ---------- Tableau de bord ----------
function Dashboard() {
  const [vitals, setVitals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE}/users/me`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (user && (user.role === 'practitioner' || user.role === 'admin')) {
          return fetch(`${API_BASE}/users/me/patients`, { headers })
            .then((r) => (r.ok ? r.json() : { patient_ids: [] }))
            .then((data) => data.patient_ids?.length ? `?patient_ids=${data.patient_ids.join(',')}` : '');
        }
        return '';
      })
      .then((query) => fetch(`${API_BASE}/dashboard${query}`, { headers }))
      .then((r) => (r.ok ? r.json() : { vitals: [], alerts: [], risk_assessments: [] }))
      .then((data) => {
        setVitals(data.vitals || []);
        setAlerts(data.alerts || []);
        setRiskAssessments(data.risk_assessments || []);
      })
      .catch(() => setError('Impossible de charger le tableau de bord.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p className="loading">Chargement du tableau de bord...</p></div>;
  if (error) return <div className="card"><div className="message message--error">{error}</div></div>;

  return (
    <>
      <div className="card">
        <h2>Tableau de bord</h2>
        <p className="text-muted">Dernières mesures et alertes.</p>
      </div>
      {riskAssessments.length > 0 && (
        <div className="card">
          <h2>Évaluations de risque IA</h2>
          <div className="risk-list">
            {riskAssessments.slice(0, 5).map((ra) => (
              <div key={ra.id} className={`risk-item risk-item--${(ra.risk_level || 'low').toLowerCase()}`}>
                <strong>Niveau : {ra.risk_level || 'N/A'}</strong>
                {ra.recommendations?.length > 0 && (
                  <ul className="list list--compact">
                    {ra.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                )}
                {ra.created_at && <span className="text-muted">{new Date(ra.created_at).toLocaleString()}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      {alerts.length > 0 && (
        <div className="card">
          <h2>Alertes</h2>
          <ul className="list">{alerts.map((a) => <li key={a.id} className={a.severity === 'high' ? 'alert-high' : ''}>{a.message || a.body}</li>)}</ul>
        </div>
      )}
      <div className="card">
        <h2>Dernières mesures</h2>
        {vitals.length === 0 ? (
          <p className="text-muted">Aucune mesure enregistrée. Utilisez « Saisir une mesure ».</p>
        ) : (
          <div className="vital-grid">
            {vitals.slice(0, 10).map((v, i) => (
              <div key={v.id || i} className="vital-item">
                <span className="vital-item__value">{v.value} {v.unit || ''}</span>
                <span className="vital-item__meta">{v.type} – {v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---------- UC3: Historique des mesures ----------
function VitalHistory() {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_BASE}/vitals/history?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setVitals)
      .catch(() => setError('Impossible de charger l\'historique.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="card"><p className="loading">Chargement de l'historique...</p></div>;
  if (error) return <div className="card"><div className="message message--error">{error}</div></div>;

  return (
    <div className="card">
      <h2>Historique des mesures</h2>
      <p className="text-muted">Toutes vos mesures enregistrées, des plus récentes aux plus anciennes.</p>
      {vitals.length === 0 ? (
        <p className="text-muted">Aucune mesure enregistrée.</p>
      ) : (
        <div className="vital-grid vital-grid--history">
          {vitals.map((v, i) => (
            <div key={v.id || i} className="vital-item">
              <span className="vital-item__value">{v.value} {v.unit || ''}</span>
              <span className="vital-item__meta">{v.type} – {v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Saisie mesure ----------
function AddVital() {
  const [type, setType] = useState('heart_rate');
  const [value, setValue] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    if (!value.trim()) { setMessage('Veuillez saisir une valeur.'); return; }
    const num = parseFloat(value);
    if (Number.isNaN(num)) { setMessage('Valeur numérique invalide.'); return; }
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, value: num, source: 'manual' }),
      });
      const data = await parseResponse(res);
      if (!res.ok) throw new Error(getErrorMessage(data, 'Erreur enregistrement'));
      setMessage('Mesure enregistrée.');
      setValue('');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card--form">
      <h2>Saisir une mesure</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="vital-type">Type</label>
          <select id="vital-type" name="type" value={type} onChange={(e) => setType(e.target.value)} disabled={loading}>
            <option value="heart_rate">Fréquence cardiaque (bpm)</option>
            <option value="blood_pressure_systolic">Pression systolique (mmHg)</option>
            <option value="blood_pressure_diastolic">Pression diastolique (mmHg)</option>
            <option value="spo2">SpO2 (%)</option>
            <option value="temperature">Température (°C)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="vital-value">Valeur</label>
          <input id="vital-value" name="value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="ex. 72" disabled={loading} />
        </div>
        {message && <div className={message.startsWith('Mesure') ? 'message message--success' : 'message message--error'} role="alert">{message}</div>}
        <button type="submit" className="btn btn--primary" disabled={loading}>{loading ? 'Envoi...' : 'Enregistrer'}</button>
      </form>
    </div>
  );
}

// ---------- Layout ----------
function Layout({ children }) {
  const location = useLocation(); // Force re-render on navigation pour mettre à jour le bouton
  const token = getToken();
  return (
    <div className="app">
      <header className="header">
        <Link to="/dashboard" className="header__brand">Surveillance Santé</Link>
        <nav className="nav">
          <Link to="/dashboard" className="nav__link">Tableau de bord</Link>
          <Link to="/vitals" className="nav__link">Saisir une mesure</Link>
          <Link to="/history" className="nav__link">Historique</Link>
          {token ? (
            <button type="button" className="btn btn--secondary" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>Déconnexion</button>
          ) : (
            <Link to="/login" className="btn btn--secondary">Connexion</Link>
          )}
        </nav>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

// ---------- App ----------
const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

export default function App() {
  return (
    <BrowserRouter future={routerFutureFlags}>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/vitals" element={<ProtectedRoute><AddVital /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><VitalHistory /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

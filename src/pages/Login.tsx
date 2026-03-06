import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/LOGO-KATOS (2).png';
import './Login.css';

const DEMO_ACCOUNTS = [
    { name: 'Admin Katos', email: 'admin@katos.sn', password: 'admin123', role: 'Admin' },
    { name: 'Omar Diallo', email: 'omar@katos.sn', password: 'omar123', role: 'Manager' },
    { name: 'Abdou Sarr', email: 'abdou@katos.sn', password: 'abdou123', role: 'Commercial' },
];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ok = login(email, password);
        if (ok) navigate('/');
        else setError('Email ou mot de passe incorrect.');
    };

    const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
        setEmail(acc.email);
        setPassword(acc.password);
        setError('');
    };

    return (
        <div className="login-page">
            <div className="login-orb login-orb-1"></div>
            <div className="login-orb login-orb-2"></div>
            <div className="login-orb login-orb-3"></div>

            <div className="login-card">
                <div className="login-brand">
                    <img src={logo} alt="Katos" className="login-logo" style={{ maxWidth: '180px' }} />
                    <p>Connectez-vous à votre espace CRM</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div>
                        <label className="login-label">Adresse email</label>
                        <input
                            className="login-input"
                            type="email"
                            placeholder="vous@katos.sn"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            required
                        />
                    </div>
                    <div>
                        <label className="login-label">Mot de passe</label>
                        <input
                            className="login-input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            required
                        />
                    </div>
                    {error && <div className="login-error">⚠️ {error}</div>}
                    <button className="login-btn" type="submit">Se connecter →</button>
                </form>

                {/* Comptes démo */}
                <div className="demo-accounts">
                    <p className="demo-title">Comptes de démonstration</p>
                    <div className="demo-chips">
                        {DEMO_ACCOUNTS.map(acc => (
                            <button key={acc.email} className="demo-chip" type="button" onClick={() => fillDemo(acc)}>
                                <span>{acc.name} — <span style={{ opacity: 0.6 }}>{acc.email}</span></span>
                                <span className="demo-chip-role">{acc.role}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import logo from '@/assets/LOGO-KATOS (2).png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const { error } = await login(email, password);
        if (!error) navigate('/');
        else {
            if (error.status === 400) setError('Identifiants invalides.');
            else setError(error.message || 'Une erreur est survenue lors de la connexion.');
        }
    };

    return (
        <div className="login-page">
            <div className="login-orb login-orb-1"></div>
            <div className="login-orb login-orb-2"></div>

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
            </div>
        </div>
    );
};

export default Login;

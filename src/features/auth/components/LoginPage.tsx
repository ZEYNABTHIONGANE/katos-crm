import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { Eye, EyeOff } from 'lucide-react';
import logo from '@/assets/LOGO-KATOS (2).png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTakingLong, setIsTakingLong] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setError('');
        setIsLoading(true);
        setIsTakingLong(false);

        const timer = setTimeout(() => {
            setIsTakingLong(true);
        }, 3000);

        try {
            const { error } = await login(email, password);
            clearTimeout(timer);
            if (!error) {
                navigate('/');
            } else {
                if (error.status === 400) setError('Identifiants invalides.');
                else setError(error.message || 'Une erreur est survenue lors de la connexion.');
            }
        } catch (err) {
            clearTimeout(timer);
            console.error('[LoginPage] Submit error:', err);
            setError('Une erreur technique est survenue.');
        } finally {
            setIsLoading(false);
            setIsTakingLong(false);
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
                        <div className="password-input-wrapper">
                            <input
                                className="login-input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                    {error && <div className="login-error">⚠️ {error}</div>}
                    <button 
                        className="login-btn" 
                        type="submit" 
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="d-flex align-center justify-center gap-2">
                                <div className="spinner-sm"></div>
                                Connexion...
                            </div>
                        ) : 'Se connecter →'}
                    </button>
                    {isLoading && isTakingLong && (
                        <p className="text-center text-xs text-muted mt-4 animate-pulse">
                            Finalisation de la connexion, veuillez patienter...
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Login;

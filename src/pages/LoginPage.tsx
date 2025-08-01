import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '../api/firebase';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter both email and password');
            return;
        }
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            toast.error(err.message || 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    };

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center parchment-texture">
            <form className="bg-parchment p-8 rounded-xl shadow-lg border border-gold/20 max-w-sm w-full">
                <h2 className="text-xl font-display text-deepbrown mb-6 text-center">Login</h2>
                <input
                    className="w-full mb-4 p-3 rounded-lg border border-gold/30 bg-parchment-dark text-deepbrown"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    className="w-full mb-4 p-3 rounded-lg border border-gold/30 bg-parchment-dark text-deepbrown"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    onClick={(e) => handleLogin(e)}
                    className="w-full mb-3"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                        </>
                    ) : (
                        'Login'
                    )}
                </Button>
                <Button
                    onClick={() => navigate('/register')}
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                >
                    Need to Register?
                </Button>
            </form>
        </div>
    );
};

export default LoginPage;

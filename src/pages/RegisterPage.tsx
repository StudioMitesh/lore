import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { doc, setDoc } from 'firebase/firestore';
import { type UserProfile } from '@/lib/types';
import { formatISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth, db } from '../api/firebase';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const validateForm = () => {
        if (!username || !email || !password) {
            toast.error('Please fill in all fields');
            return false;
        }
        if (username.length < 3) {
            toast.error('Username must be at least 3 characters long');
            return false;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return false;
        }
        if (!email.includes('@')) {
            toast.error('Please enter a valid email address');
            return false;
        }
        return true;
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: username,
            });

            const timestamp = formatISO(new Date());

            const newProfile: UserProfile = {
                uid: user.uid,
                email,
                username,
                first_name: '',
                last_name: '',
                bio: '',
                avatarUrl: '',
                coverPhotoUrl: '',
                location: '',
                website: '',
                socialLinks: {
                    twitter: '',
                    instagram: '',
                    linkedin: '',
                    github: '',
                },
                interests: [],
                languagesSpoken: [],
                favoritePlaces: [],
                stats: {
                    entries: 0,
                    countries: 0,
                    continents: 0,
                    badges: 0,
                    totalPhotos: 0,
                },
                badges: [],
                createdAt: timestamp,
                updatedAt: timestamp,
                favorites: [],
            };

            await setDoc(doc(db, 'profiles', user.uid), newProfile);
            toast.success('Registration successful!');
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Registration error:', err);
            toast.error(err.message || 'Failed to register');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center parchment-texture">
            <form className="bg-parchment p-8 rounded-xl shadow-lg border border-gold/20 max-w-sm w-full">
                <h2 className="text-xl font-display text-deepbrown mb-6 text-center">Register</h2>

                <input
                    className="w-full mb-4 p-3 rounded-lg border border-gold/30 bg-parchment-dark text-deepbrown"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
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
                    onClick={(e) => handleRegister(e)}
                    className="w-full mb-3"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                        </>
                    ) : (
                        'Register'
                    )}
                </Button>
                <Button
                    onClick={() => navigate('/login')}
                    className="w-full"
                    variant="outline"
                    disabled={isLoading}
                >
                    Need to Login instead?
                </Button>
            </form>
        </div>
    );
};

export default RegisterPage;

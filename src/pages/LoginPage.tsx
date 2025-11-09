'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    if (!auth) {
      toast.error('Firebase is not initialized. Please check your environment variables.');
      console.error('Firebase auth is not available');
      return;
    }
    
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/user-not-found') {
        toast.error('No account found with this email. Please register first.');
      } else if (err.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (err.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(err.message || 'Failed to login. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    return null;
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
          type="submit"
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
          type="button"
          onClick={(e) => {
            e.preventDefault();
            router.push('/register');
          }}
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

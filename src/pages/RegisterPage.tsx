import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/api/firebase'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/api/firebase'
import { type UserProfile } from '@/lib/types'
import { formatISO } from 'date-fns'

const RegisterPage = () => {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      const timestamp = formatISO(new Date())

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
          github: ''
        },
        interests: [],
        languagesSpoken: [],
        favoritePlaces: [],
        stats: {
          entries: 0,
          countries: 0,
          continents: 0,
          badges: 0
        },
        badges: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        favorites: []
      }

      await setDoc(doc(db, 'profiles', user.uid), newProfile)

      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center parchment-texture">
      <form
        className="bg-parchment p-8 rounded-xl shadow-lg border border-gold/20 max-w-sm w-full"
      >
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
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <Button onClick={(e) => handleRegister(e)} className="w-full">Register</Button>
        <Button onClick={() => navigate("/login")} className="w-full" variant="ghost">Need to Login instead?</Button>
      </form>
    </div>
  )
}

export default RegisterPage

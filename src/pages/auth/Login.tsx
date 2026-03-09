import { type FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { supabase } from '../../lib/supabaseClient'

const Login = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const search = new URLSearchParams(location.search)
  const redirectTo = search.get('redirect') ?? '/'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong while signing in.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center py-8">
      <Card className="w-full max-w-md px-6 py-7 space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            Welcome back
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to continue your NebulaX feed.
          </p>
        </div>
        {error ? (
          <p className="text-[11px] text-center text-red-400">
            {error}
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-[11px] text-center text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-sky-400 hover:text-sky-300">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Login


import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { supabase } from '../../lib/supabaseClient'

const Register = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!username.trim()) {
      setError('Please choose a username.')
      return
    }

    setIsSubmitting(true)
    try {
      // 1) Create auth user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError
      const user = signUpData.user
      if (!user) {
        throw new Error('No user returned from sign up.')
      }

      // 2) Optional: upload avatar to Storage bucket `images`
      let avatarUrl: string | null = null
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() ?? 'png'
        const filePath = `${user.id}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, avatarFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(uploadData.path)

        avatarUrl = publicUrlData.publicUrl
      }

      // 3) Insert profile row
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        username: username.trim(),
        display_name: displayName.trim() || username.trim(),
        avatar_url: avatarUrl,
      })

      if (profileError) throw profileError

      setSuccessMessage('Account created! You can sign in now.')
      setDisplayName('')
      setUsername('')
      setEmail('')
      setPassword('')
      setAvatarFile(null)
      setAvatarPreview(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong during registration.'
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
            Create your account
          </h1>
          <p className="text-xs text-slate-400">
            Join NebulaX and start sharing your X.
          </p>
        </div>
        {error ? (
          <p className="text-[11px] text-center text-red-400">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="text-[11px] text-center text-emerald-400">
            {successMessage}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-2">
          <label className="group relative cursor-pointer">
            <div className="relative h-20 w-20 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shadow-md shadow-black/40">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-slate-500">
                  Add avatar
                </span>
              )}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-slate-200 transition-opacity">
                Change
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null
                setAvatarFile(file)
                if (file) {
                  const objectUrl = URL.createObjectURL(file)
                  setAvatarPreview(objectUrl)
                } else {
                  setAvatarPreview(null)
                }
              }}
            />
          </label>
          <p className="text-[11px] text-slate-500">
            Click the avatar to upload a profile picture.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            required
            autoComplete="username"
            placeholder="yourhandle"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            label="Display name"
            type="text"
            required
            autoComplete="name"
            placeholder="Your name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
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
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="text-[11px] text-center text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:text-sky-300">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  )
}

export default Register


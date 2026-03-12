import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import SectionTitle from '../../components/ui/SectionTitle'
import { useAuth } from '../../context/AuthContext'
import { fetchRecentPosts, type Post } from '../../lib/posts'
import PostCard from '../../components/feed/PostCard'

const marketingHome = () => (
  <div className="space-y-16">
    <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-xs font-medium text-sky-300 shadow-sm shadow-sky-500/30 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          Live now — a new way to do \"X\"
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-50">
            A personal social feed{' '}
            <span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              tuned for your X.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl">
            NebulaX is a dark, distraction-free space where you share what actually matters.
            No chaos. No noise. Just you, your ideas, and the people who care.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Link to="/register" className="sm:w-auto">
            <Button size="lg" fullWidth>
              Create account
            </Button>
          </Link>
          <Link to="/login" className="sm:w-auto">
            <Button variant="outline" size="lg" fullWidth>
              Login
            </Button>
          </Link>
          <p className="text-xs text-slate-400 sm:ml-2">
            No algorithms. No ads. Just real-time signal.
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(37,99,235,0.45),_transparent_65%)] opacity-80" />
        <Card className="relative overflow-hidden">
          <div className="border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-xs font-semibold">
                NX
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-50">Your personal feed</p>
                <p className="text-[11px] text-slate-400">Preview · Mock activity</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500">Now</span>
          </div>
          <div className="px-4 py-6 space-y-3 text-sm text-slate-300">
            <p>Sign in to see real posts and start sharing your own.</p>
          </div>
        </Card>
      </div>
    </section>

    <section className="space-y-8">
      <SectionTitle>
        Built for signal, not noise.
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-50">
            Dark, cinematic canvas
          </p>
          <p className="text-xs text-slate-300">
            A carefully tuned dark theme with electric blues so your content glows without burning your eyes.
          </p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-50">
            Personal by default
          </p>
          <p className="text-xs text-slate-300">
            Start with a focused circle. Share updates, thoughts, and builds around the one X that matters to you.
          </p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold text-slate-50">
            Ready to grow
          </p>
          <p className="text-xs text-slate-300">
            Designed to scale from your first post to a thriving community without losing the personal feel.
          </p>
        </Card>
      </div>
    </section>
  </div>
)

const Home = () => {
  const { user } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoadingPosts, setIsLoadingPosts] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setIsLoadingPosts(true)
    setError(null)

    void (async () => {
      try {
        const data = await fetchRecentPosts()
        setPosts(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load posts.'
        setError(message)
      } finally {
        setIsLoadingPosts(false)
      }
    })()
  }, [user])

  useEffect(() => {
    const handlePostCreated = (event: Event) => {
      const customEvent = event as CustomEvent<Post>
      if (customEvent.detail) {
        setPosts((current) => [customEvent.detail, ...current])
      }
    }
    
    window.addEventListener('post-created', handlePostCreated)
    return () => window.removeEventListener('post-created', handlePostCreated)
  }, [])

  if (!user) {
    return marketingHome()
  }

  return (
    <div className="space-y-8">
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/20 text-red-400 text-sm">
          {error}
        </Card>
      )}

      {isLoadingPosts ? (
        <Card className="p-6 text-sm text-slate-400 text-center">
          Loading posts…
        </Card>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-slate-400 text-sm max-w-sm">
            Your universe is empty. Be the first to post something and start building your Nebula.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDeleted={(id) =>
                setPosts((current) => current.filter((p) => p.id !== id))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Home


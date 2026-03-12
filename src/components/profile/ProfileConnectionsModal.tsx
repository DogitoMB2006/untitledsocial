import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import type { ProfileListItem } from '../../lib/profile'

interface ProfileConnectionsModalProps {
  isOpen: boolean
  type: 'followers' | 'following'
  profileName: string
  items: ProfileListItem[]
  isLoading: boolean
  error?: string | null
  onClose: () => void
}

const ProfileConnectionsModal = ({
  isOpen,
  type,
  profileName,
  items,
  isLoading,
  error,
  onClose,
}: ProfileConnectionsModalProps) => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    setSearch('')
  }, [isOpen, type])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items

    return items.filter((item) => {
      const displayName = item.display_name?.toLowerCase() ?? ''
      const username = item.username.toLowerCase()
      return displayName.includes(query) || username.includes(query)
    })
  }, [items, search])

  if (!isOpen) return null

  const title = type === 'followers' ? 'Followers' : 'Following'

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/80 px-4 pt-20 pb-8 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
              <p className="text-xs text-slate-400">
                {profileName}'s {type}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-1 text-[11px] text-slate-200 transition-colors hover:border-sky-500/50 hover:text-sky-200"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${type}...`}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          />

          <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 rounded-2xl border border-slate-800 bg-slate-900/70"
                  />
                ))}
              </div>
            ) : error ? (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-sm text-slate-400">
                {items.length === 0
                  ? `No ${type} yet.`
                  : `No ${type} match "${search.trim()}".`}
              </p>
            ) : (
              filteredItems.map((item) => {
                const displayName = item.display_name || item.username
                const initials = (displayName[0] ?? 'U').toUpperCase()

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/u/${item.username}`)
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-left transition-colors hover:border-sky-500/40 hover:bg-slate-900"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                      {item.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.avatar_url}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500/30 to-slate-900 text-sm font-semibold text-slate-100">
                          {initials}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-slate-400">@{item.username}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ProfileConnectionsModal

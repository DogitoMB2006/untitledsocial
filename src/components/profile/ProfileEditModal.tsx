import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Button from '../ui/Button'
import Input from '../ui/Input'
import {
  MAX_BIO_LENGTH,
  type Profile,
  type ProfileUpdateInput,
  updateProfile,
  validateProfileInput,
} from '../../lib/profile'
import { uploadImages } from '../../lib/storage'

interface ProfileEditModalProps {
  isOpen: boolean
  profile: Profile | null
  onClose: () => void
  onSaved: (profile: Profile) => void
}

const ProfileEditModal = ({
  isOpen,
  profile,
  onClose,
  onSaved,
}: ProfileEditModalProps) => {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const avatarObjectUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  )
  const bannerObjectUrl = useMemo(
    () => (bannerFile ? URL.createObjectURL(bannerFile) : null),
    [bannerFile],
  )

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) {
        URL.revokeObjectURL(avatarObjectUrl)
      }
    }
  }, [avatarObjectUrl])

  useEffect(() => {
    return () => {
      if (bannerObjectUrl) {
        URL.revokeObjectURL(bannerObjectUrl)
      }
    }
  }, [bannerObjectUrl])

  useEffect(() => {
    if (!isOpen || !profile) return
    setDisplayName(profile.display_name ?? '')
    setUsername(profile.username ?? '')
    setBio(profile.bio ?? '')
    setAvatarFile(null)
    setBannerFile(null)
    setErrors({})
    setSubmitError(null)
  }, [isOpen, profile])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !profile) return null

  const avatarPreview = avatarObjectUrl ?? profile.avatar_url
  const bannerPreview = bannerObjectUrl ?? profile.banner_url
  const initials = (displayName.trim()[0] ?? profile.username[0] ?? 'U').toUpperCase()

  const handleSave = async () => {
    const payload: ProfileUpdateInput = {
      display_name: displayName,
      username,
      bio,
    }
    const validation = validateProfileInput(payload)

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setErrors({})
    setSubmitError(null)
    setIsSaving(true)

    try {
      let avatarUrl = profile.avatar_url
      let bannerUrl = profile.banner_url

      if (avatarFile) {
        const urls = await uploadImages([avatarFile], 'avatars')
        avatarUrl = urls[0] ?? avatarUrl
      }
      if (bannerFile) {
        const urls = await uploadImages([bannerFile], 'banners')
        bannerUrl = urls[0] ?? bannerUrl
      }

      const updated = await updateProfile(profile.id, {
        ...payload,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
      })

      onSaved(updated)
      onClose()
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to save your profile. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/80 backdrop-blur-md px-4 pt-16 pb-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-50">Edit profile</h2>
          <p className="text-xs text-slate-400">
            Update your public identity and visuals.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-300">Banner</p>
            <label className="relative block h-36 w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70">
              {bannerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                  Click to upload banner
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setBannerFile(file)
                }}
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-700 bg-slate-900">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-lg font-semibold text-slate-100">
                  {initials}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setAvatarFile(file)
                }}
              />
            </label>
            <div className="text-xs text-slate-400">
              Click avatar or banner to upload an image.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
            />
            <Input
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={24}
              error={errors.username}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="profile-bio">
              Bio
            </label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={MAX_BIO_LENGTH}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              placeholder="Tell people a little about yourself."
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-red-400">{errors.bio ?? ''}</p>
              <p className="text-xs text-slate-500">
                {bio.length}/{MAX_BIO_LENGTH}
              </p>
            </div>
          </div>

          {submitError ? (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ProfileEditModal

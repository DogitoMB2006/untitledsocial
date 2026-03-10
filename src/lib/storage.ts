import { supabase } from './supabaseClient'

export async function uploadImages(
  files: File[],
  basePath: 'posts' | 'comments',
): Promise<string[]> {
  const urls: string[] = []

  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'png'
    const fileName = `${crypto.randomUUID()}.${ext}`
    const path = `${basePath}/${fileName}`

    const { data, error } = await supabase.storage
      .from('images')
      .upload(path, file)

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[NebulaX] Failed to upload image', error)
      throw error
    }

    const { data: publicUrl } = supabase.storage
      .from('images')
      .getPublicUrl(data.path)

    urls.push(publicUrl.publicUrl)
  }

  return urls
}


import { useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { pipeline, env } from '@huggingface/transformers'
import { createClient } from '@supabase/supabase-js'
import {
  Sparkles, Mic, Send, Globe, MessageCircle, Image, Video,
  FileText, Menu, Volume2, Square
} from 'lucide-react'
import './index.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [language, setLanguage] = useState('om-ET')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)
  const [showImageTool, setShowImageTool] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [textVideoPrompt, setTextVideoPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState('')
  const [imageMimeType, setImageMimeType] = useState('image/png')
  const [imageLoading, setImageLoading] = useState(false)
  const [showVideoTool, setShowVideoTool] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageDuration, setImageDuration] = useState('5')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoFile2, setVideoFile2] = useState<File | null>(null)
  const [videoUrl2, setVideoUrl2] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoStart, setVideoStart] = useState('0')
  const [videoEnd, setVideoEnd] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoOutput, setVideoOutput] = useState('')
  const [narrationFile, setNarrationFile] = useState<File | null>(null)
  const [aiNarrationText, setAiNarrationText] = useState('')
  const [aiNarrationVoice, setAiNarrationVoice] = useState('af_heart')
  const [aiNarrationFile, setAiNarrationFile] = useState<File | null>(null)
  const [aiNarrationUrl, setAiNarrationUrl] = useState('')
  const [aiNarrationLoading, setAiNarrationLoading] = useState(false)
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const [videoNotice, setVideoNotice] = useState('')
  const [captionText, setCaptionText] = useState('')
  const [captionStart, setCaptionStart] = useState('0')
  const [captionEnd, setCaptionEnd] = useState('5')
  const [multipleCaptions, setMultipleCaptions] = useState('0|5|Barnoonni furtuu milkaa\'inaati.\n6|10|Beekumsi jireenya namaa jijjiira.\n11|15|Carraa kee har\'a ijaari.')
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const transcriberRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)


  const [showTranslateTool, setShowTranslateTool] = useState(false)
  const [translateText, setTranslateText] = useState('')
  const [sourceLanguage, setSourceLanguage] = useState('auto')
  const [targetLanguage, setTargetLanguage] = useState('om-ET')
  const [translation, setTranslation] = useState('')
  const [translateLoading, setTranslateLoading] = useState(false)
  const [showWritingTool, setShowWritingTool] = useState(false)
  const [writingText, setWritingText] = useState('')
  const [writingTask, setWritingTask] = useState('create')
  const [writingResult, setWritingResult] = useState('')
  const [writingLoading, setWritingLoading] = useState(false)


  const recognitionRef = useRef<any>(null)

  const selectVideo = (file: File | undefined) => {
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setVideoNotice(t("videoFileOnly"))
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setVideoNotice(t("videoTooLarge"))
      return
    }

    setVideoFile(file)
    setVideoUrl(URL.createObjectURL(file))
    setVideoOutput('')
    setVideoNotice(t("videoSelected"))
    setVideoEnd('')
  }

  const selectVideo2 = (file: File | undefined) => {
    if (!file) return

    if (!file.type.startsWith('video/')) {
      setVideoNotice(t("videoFileOnly"))
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      setVideoNotice(t("secondVideoTooLarge"))
      return
    }

    setVideoFile2(file)
    setVideoUrl2(URL.createObjectURL(file))
    setVideoOutput('')
    setVideoNotice(t("secondVideoSelected"))
  }

  const createImageVideo = async (imageOverride?: File) => {
    const selectedImageFile = imageOverride ?? imageFile

    if (!selectedImageFile) {
      setVideoNotice(t("imageFileMissing"))
      return
    }

    const duration = Number(imageDuration)
    if (![5, 10, 15].includes(duration)) {
      setVideoNotice(t("imageDurationInvalid"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("ffmpegPreparing"))

    let ffmpeg = ffmpegRef.current
    const suffix = Date.now()
    const inputName = `image-input-${suffix}.jpg`
    const outputName = `image-video-${suffix}.mp4`

    try {
      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      setVideoNotice(t("imageVideoConverting"))

      await ffmpeg.writeFile(inputName, await fetchFile(selectedImageFile))

      const frames = duration * 24
      const filter =
        `scale=640:360:force_original_aspect_ratio=increase,` +
        `crop=640:360,` +
        `zoompan=z='1+0.0008*on':` +
        `x='(iw-iw/zoom)*on/${frames}':` +
        `y='(ih-ih/zoom)/2':d=${frames}:s=640x360:fps=24`

      await ffmpeg.exec([
        '-loop', '1',
        '-framerate', '24',
        '-i', inputName,
        '-vf', filter,
        '-frames:v', String(frames),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '28',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputName
      ])

      const data = await ffmpeg.readFile(outputName)

      if (typeof data === 'string') {
        throw new Error(t("videoMp4Invalid"))
      }

      const blob = new Blob([data.buffer as ArrayBuffer], {
        type: 'video/mp4'
      })

      setVideoOutput(URL.createObjectURL(blob))
      setVideoNotice(t("imageVideoSuccess"))

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)

    } catch (error) {
      console.error(error)
      setVideoNotice(t("imageVideoFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }

  const trimVideo = async () => {
    if (!videoFile) {
      setVideoNotice(t("videoFileMissing"))
      return
    }

    const start = Number(videoStart)
    const end = Number(videoEnd)

    if (!Number.isFinite(start) || !Number.isFinite(end) ||
        start < 0 || end <= start) {
      setVideoNotice(t("trimTimeInvalid"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("ffmpegPreparing"))

    try {
      let ffmpeg = ffmpegRef.current

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      setVideoNotice(t("trimBusy"))

      const ext = videoFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'mp4'
      const inputName = `input.${ext}`
      const outputName = 'hello-ai-output.mp4'
      const duration = end - start

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

      await ffmpeg.exec([
        '-ss', String(start),
        '-i', inputName,
        '-t', String(duration),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName
      ])

      const data = await ffmpeg.readFile(outputName)

      if (typeof data === 'string') {
        throw new Error(t("videoMp4Invalid"))
      }

      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)

      setVideoOutput(url)
      setVideoNotice(t("trimSuccess"))
    } catch (error) {
      console.error(error)
      setVideoNotice(t("trimFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }

  const mergeVideos = async () => {
    if (!videoFile || !videoFile2) {
      setVideoNotice(t("mergeFilesMissing"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("mergePreparing"))

    const suffix = Date.now()
    const firstName = `merge-first-${suffix}.mp4`
    const secondName = `merge-second-${suffix}.mp4`
    const listName = `merge-list-${suffix}.txt`
    const outputName = `hello-ai-merged-${suffix}.mp4`

    try {
      let ffmpeg = ffmpegRef.current

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      setVideoNotice(t("mergeLoading"))

      await ffmpeg.writeFile(firstName, await fetchFile(videoFile))
      await ffmpeg.writeFile(secondName, await fetchFile(videoFile2))

      const listText = `file '${firstName}'\nfile '${secondName}'\n`
      await ffmpeg.writeFile(
        listName,
        new TextEncoder().encode(listText)
      )

      setVideoNotice(t("mergeBusy"))

      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', listName,
        '-c', 'copy',
        '-movflags', '+faststart',
        outputName
      ])

      const data = await ffmpeg.readFile(outputName)

      if (typeof data === 'string') {
        throw new Error(t("videoMp4Invalid"))
      }

      const blob = new Blob([data.buffer as ArrayBuffer], { type: 'video/mp4' })
      const url = URL.createObjectURL(blob)

      setVideoOutput(url)
      setVideoNotice(t("mergeSuccess"))

      await ffmpeg.deleteFile(firstName)
      await ffmpeg.deleteFile(secondName)
      await ffmpeg.deleteFile(listName)
      await ffmpeg.deleteFile(outputName)
    } catch (error) {
      console.error(error)
      setVideoNotice(t("mergeFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }

  const addVideoCaption = async () => {
    if (!videoFile) {
      setVideoNotice(t("videoFileMissing"))
      return
    }

    const start = Number(captionStart)
    const end = Number(captionEnd)

    if (!captionText.trim() || !Number.isFinite(start) ||
        !Number.isFinite(end) || start < 0 || end <= start) {
      setVideoNotice(t("captionTextInvalid"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("subtitleBusy"))

    const suffix = Date.now()
    const inputName = `caption-input-${suffix}.mp4`
    const imageName = `caption-overlay-${suffix}.png`
    const outputName = `hello-ai-caption-${suffix}.mp4`

    try {
      let ffmpeg = ffmpegRef.current

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      const metadataVideo = document.createElement('video')
      metadataVideo.preload = 'metadata'
      metadataVideo.src = URL.createObjectURL(videoFile)

      await new Promise<void>((resolve, reject) => {
        metadataVideo.onloadedmetadata = () => resolve()
        metadataVideo.onerror = () => reject(
          new Error(t("videoMetadataFailed"))
        )
      })

      const width = metadataVideo.videoWidth || 1280
      const height = metadataVideo.videoHeight || 720
      const duration = metadataVideo.duration
      URL.revokeObjectURL(metadataVideo.src)

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(t("videoDurationMissing"))
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error(t("canvasUnavailable"))

      const fontSize = Math.max(24, Math.round(width * 0.045))
      const padding = Math.round(fontSize * 0.55)
      const maxWidth = width * 0.88

      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      const words = captionText.trim().split(/\s+/)
      const lines: string[] = []
      let line = ''

      for (const word of words) {
        const test = line ? `${line} ${word}` : word

        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line)
          line = word
        } else {
          line = test
        }
      }

      if (line) lines.push(line)

      const lineHeight = Math.round(fontSize * 1.25)
      const boxHeight = lines.length * lineHeight + padding * 2
      const boxY = height - boxHeight - Math.round(height * 0.06)

      ctx.fillStyle = 'rgba(0,0,0,0.72)'
      ctx.fillRect(width * 0.04, boxY, width * 0.92, boxHeight)

      ctx.fillStyle = '#ffffff'
      lines.forEach((text, index) => {
        ctx.fillText(
          text,
          width / 2,
          boxY + padding + lineHeight * (index + 0.5),
          maxWidth
        )
      })

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => blob
            ? resolve(blob)
            : reject(new Error('Suuraa subtitle uumuu hin dandeenye.')),
          'image/png'
        )
      })

      setVideoNotice(t("subtitleBusy"))

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))
      await ffmpeg.writeFile(imageName, await fetchFile(pngBlob))

      await ffmpeg.exec([
        '-i', inputName,
        '-loop', '1', '-i', imageName,
        '-filter_complex',
        `[1:v]scale=640:-2,format=rgba[caption];[0:v]scale=640:-2,fps=24[base];[base][caption]overlay=0:0:enable='between(t\\,${start}\\,${end})'[v]`,
        '-map', '[v]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-threads', '1',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        '-t', String(duration),
        outputName
      ])

      const data = await ffmpeg.readFile(outputName)

      if (typeof data === 'string') {
        throw new Error(t("videoMp4Invalid"))
      }

      const blob = new Blob(
        [data.buffer as ArrayBuffer],
        { type: 'video/mp4' }
      )

      setVideoOutput(URL.createObjectURL(blob))
      setVideoNotice(t("subtitleSuccess"))

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(imageName)
      await ffmpeg.deleteFile(outputName)

    } catch (error) {
      console.error(error)
      setVideoNotice(t("subtitleFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }


  const addMultipleVideoCaptions = async () => {
    if (!videoFile) {
      setVideoNotice(t("videoFileMissing"))
      return
    }

    const captions = multipleCaptions
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|')
        return {
          start: Number(parts[0]),
          end: Number(parts[1]),
          text: parts.slice(2).join('|').trim()
        }
      })

    if (
      captions.length < 1 ||
      captions.length > 10 ||
      captions.some(c =>
        !Number.isFinite(c.start) ||
        !Number.isFinite(c.end) ||
        c.start < 0 ||
        c.end <= c.start ||
        !c.text
      )
    ) {
      setVideoNotice(t("subtitleTimeInvalid"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("autoSubtitleBusy"))

    const suffix = Date.now()
    const inputName = `multi-caption-input-${suffix}.mp4`
    const outputName = `multi-caption-output-${suffix}.mp4`
    const imageNames = captions.map((_, i) => `multi-caption-${suffix}-${i}.png`)

    try {
      let ffmpeg = ffmpegRef.current

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })
        ffmpegRef.current = ffmpeg
      }

      const metadataVideo = document.createElement('video')
      metadataVideo.preload = 'metadata'
      const metadataUrl = URL.createObjectURL(videoFile)
      metadataVideo.src = metadataUrl

      await new Promise<void>((resolve, reject) => {
        metadataVideo.onloadedmetadata = () => resolve()
        metadataVideo.onerror = () => reject(
          new Error(t("videoDurationMissing"))
        )
      })

      const width = metadataVideo.videoWidth || 1280
      const height = metadataVideo.videoHeight || 720
      const duration = metadataVideo.duration
      URL.revokeObjectURL(metadataUrl)

      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(t("videoDurationInvalid"))
      }

      if (captions.some(c => c.end > duration)) {
        throw new Error(`Yeroon subtitle dheerina viidiyoo (${duration.toFixed(1)}s) caaluu hin qabu.`)
      }

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

      for (let i = 0; i < captions.length; i++) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t("canvasUnavailable"))

        const caption = captions[i]
        const fontSize = Math.max(24, Math.round(width * 0.045))
        const padding = Math.round(fontSize * 0.55)
        const maxWidth = width * 0.88

        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const words = caption.text.split(/\s+/)
        const lines: string[] = []
        let line = ''

        for (const word of words) {
          const test = line ? `${line} ${word}` : word
          if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line)
            line = word
          } else {
            line = test
          }
        }
        if (line) lines.push(line)

        const lineHeight = Math.round(fontSize * 1.25)
        const boxHeight = lines.length * lineHeight + padding * 2
        const boxY = height - boxHeight - Math.round(height * 0.06)

        ctx.fillStyle = 'rgba(0,0,0,0.72)'
        ctx.fillRect(width * 0.04, boxY, width * 0.92, boxHeight)
        ctx.fillStyle = '#ffffff'

        lines.forEach((text, index) => {
          ctx.fillText(
            text,
            width / 2,
            boxY + padding + lineHeight * (index + 0.5),
            maxWidth
          )
        })

        const pngBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            blob => blob
              ? resolve(blob)
              : reject(new Error('Suuraa subtitle uumuu hin dandeenye.')),
            'image/png'
          )
        })

        await ffmpeg.writeFile(imageNames[i], await fetchFile(pngBlob))
      }

      const args: string[] = ['-i', inputName]
      captions.forEach((_, i) => {
        args.push('-loop', '1', '-i', imageNames[i])
      })

      const filters: string[] = [
        '[0:v]scale=640:-2,fps=24[base]'
      ]

      captions.forEach((caption, i) => {
        const previous = i === 0 ? 'base' : `v${i - 1}`
        const output = `v${i}`
        filters.push(
          `[${i + 1}:v]scale=640:-2,format=rgba[c${i}]`
        )
        filters.push(
          `[${previous}][c${i}]overlay=0:0:enable='between(t\\,${caption.start}\\,${caption.end})'[${output}]`
        )
      })

      args.push(
        '-filter_complex', filters.join(';'),
        '-map', `[v${captions.length - 1}]`,
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-threads', '1',
        '-crf', '28',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        '-t', String(duration),
        outputName
      )

      setVideoNotice(t("multiSubtitleBusy"))
      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') {
        throw new Error(t("videoMp4Invalid"))
      }

      const blob = new Blob(
        [data.buffer as ArrayBuffer],
        { type: 'video/mp4' }
      )
      setVideoOutput(URL.createObjectURL(blob))
      setVideoNotice(t("subtitleSuccess"))

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(outputName)
      for (const name of imageNames) {
        await ffmpeg.deleteFile(name)
      }
    } catch (error) {
      console.error(error)
      setVideoNotice(t("subtitleFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }


  const createAutomaticSubtitles = async () => {
    if (!videoFile) {
      setVideoNotice(t("videoFileMissing"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("autoSubtitleBusy"))

    const suffix = Date.now()
    const inputName = `whisper-input-${suffix}.mp4`
    const audioName = `whisper-audio-${suffix}.wav`
    let audioUrl = ''

    try {
      let ffmpeg = ffmpegRef.current

      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      if (!transcriberRef.current) {
        setVideoNotice(t("autoSubtitleBusy"))
        env.allowLocalModels = false
        env.allowRemoteModels = true
        env.useBrowserCache = false

        transcriberRef.current = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny',
          { dtype: 'q8' }
        )
      }

      setVideoNotice(t("subtitleExtracting"))
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile))

      await ffmpeg.exec([
        '-i', inputName,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'pcm_s16le',
        audioName
      ])

      const wavData = await ffmpeg.readFile(audioName)

      if (typeof wavData === 'string') {
        throw new Error(t("videoAudioInvalid"))
      }

      const audioBlob = new Blob(
        [wavData.buffer as ArrayBuffer],
        { type: 'audio/wav' }
      )
      audioUrl = URL.createObjectURL(audioBlob)

      setVideoNotice(t("subtitleTranscribing"))

      const result = await transcriberRef.current(audioUrl, {
        return_timestamps: true,
        chunk_length_s: 20,
        stride_length_s: 4
      })

      const metadataVideo = document.createElement('video')
      metadataVideo.preload = 'metadata'
      const metadataUrl = URL.createObjectURL(videoFile)
      metadataVideo.src = metadataUrl

      const duration = await new Promise<number>((resolve, reject) => {
        metadataVideo.onloadedmetadata = () => resolve(metadataVideo.duration)
        metadataVideo.onerror = () => reject(
          new Error(t("videoDurationMissing"))
        )
      })

      URL.revokeObjectURL(metadataUrl)

      const validChunks = (result.chunks || []).filter((chunk: any) =>
        chunk.text?.trim() &&
        Array.isArray(chunk.timestamp) &&
        Number.isFinite(chunk.timestamp[0])
      )

      if (validChunks.length === 0 && !result.text?.trim()) {
        throw new Error(t("videoSpeechMissing"))
      }

      let lines: string[] = []

      if (validChunks.length === 0) {
        lines = [`0|${duration.toFixed(1)}|${result.text.trim()}`]
      } else {
        const groupCount = Math.min(10, validChunks.length)

        for (let i = 0; i < groupCount; i++) {
          const first = Math.floor(i * validChunks.length / groupCount)
          const last = Math.floor((i + 1) * validChunks.length / groupCount)
          const group = validChunks.slice(first, last)

          const start = Math.max(0, group[0].timestamp[0])
          const lastTimestamp = group[group.length - 1].timestamp[1]
          const end = Math.min(
            duration,
            Number.isFinite(lastTimestamp) ? lastTimestamp : duration
          )
          const text = group.map((chunk: any) => chunk.text.trim()).join(' ').trim()

          if (text && end > start) {
            lines.push(`${start.toFixed(1)}|${end.toFixed(1)}|${text}`)
          }
        }
      }

      if (lines.length === 0) {
        throw new Error(t("subtitleTimeInvalid"))
      }

      setMultipleCaptions(lines.join('\n'))
      setVideoNotice(t("subtitleSuccess"))

      await ffmpeg.deleteFile(inputName)
      await ffmpeg.deleteFile(audioName)

    } catch (error) {
      console.error(error)
      setVideoNotice(t("subtitleFailed") + String(error))
    } finally {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setVideoLoading(false)
    }
  }

  const startVoice = () => {
    const w = window as any
    const Speech = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!Speech) {
      setNotice(t("voiceUnsupported"))
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    try {
      const recognition = new Speech()
      recognitionRef.current = recognition
      recognition.lang = language
      recognition.continuous = false
      recognition.interimResults = false

      recognition.onstart = () => {
        setListening(true)
        setNotice(t("voiceListening"))
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setMessage(transcript)
        setNotice(t("voiceConverted"))
      }

      recognition.onerror = (event: any) => {
        setListening(false)
        setNotice(
          event.error === 'not-allowed'
            ? t("microphonePermission")
            : t("voiceFailed")
        )
      }

      recognition.onend = () => setListening(false)
      recognition.start()
    } catch {
      setListening(false)
      setNotice(t("microphoneStartFailed"))
    }
  }

  const speakText = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) {
      setNotice(t("speechUnsupported"))
      return
    }

    window.speechSynthesis.cancel()

    if (speakingIndex === index) {
      setSpeakingIndex(null)
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.rate = 0.9

    const voices = window.speechSynthesis.getVoices()
    const langPrefix = language.split('-')[0]
    const selectedVoice = voices.find(
      voice => voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
    )

    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.onstart = () => {
      setSpeakingIndex(index)
      setNotice('')
    }

    utterance.onend = () => setSpeakingIndex(null)
    utterance.onerror = () => {
      setSpeakingIndex(null)
      setNotice(t("speechReadFailed"))
    }

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel()
    setSpeakingIndex(null)
  }



  const startNarrationRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error(t("voiceUnsupported"))
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      recordingChunksRef.current = []

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined
      )

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })

        const file = new File(
          [blob],
          `hello-ai-narration-${Date.now()}.webm`,
          { type: blob.type }
        )

        setNarrationFile(file)
        setVideoNotice(t("recordReady"))
        recordingStreamRef.current?.getTracks().forEach(track => track.stop())
        recordingStreamRef.current = null
      }

      recorder.start()
      setIsRecording(true)
      setVideoNotice(t("recordingBusy"))
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop())
      recordingStreamRef.current = null
      setIsRecording(false)
      setVideoNotice(t("recordingFailed") + String(error))
    }
  }

  const stopNarrationRecording = () => {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }

    setIsRecording(false)
  }

  const mixNarrationAndMusic = async () => {
    if (!videoOutput) {
      setVideoNotice(t("mixVideoMissing"))
      return
    }

    const selectedNarrationFile = aiNarrationFile ?? narrationFile
    if (!selectedNarrationFile) {
      setVideoNotice(t("mixNarrationMissing"))
      return
    }

    setVideoLoading(true)
    setVideoNotice(t("mixBusy"))

    let ffmpeg = ffmpegRef.current
    const suffix = Date.now()
    const videoName = `mix-video-${suffix}.mp4`
    const voiceExt = selectedNarrationFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'wav'
    const voiceName = `mix-voice-${suffix}.${voiceExt}`
    const musicName = `mix-music-${suffix}`
    const outputName = `hello-ai-final-${suffix}.mp4`

    try {
      if (!ffmpeg) {
        ffmpeg = new FFmpeg()
        const base = `${window.location.origin}/ffmpeg`

        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm')
        })

        ffmpegRef.current = ffmpeg
      }

      const videoResponse = await fetch(videoOutput)
      if (!videoResponse.ok) {
        throw new Error(t("audioVideoDownloadFailed"))
      }

      await ffmpeg.writeFile(
        videoName,
        new Uint8Array(await videoResponse.arrayBuffer())
      )

      await ffmpeg.writeFile(voiceName, await fetchFile(selectedNarrationFile))

      const args = ['-i', videoName, '-i', voiceName]

      if (musicFile) {
        const musicExt = musicFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'mp3'
        const musicInput = `${musicName}.${musicExt}`

        await ffmpeg.writeFile(musicInput, await fetchFile(musicFile))
        args.push(
          '-stream_loop', '-1',
          '-i', musicInput,
          '-filter_complex',
          '[1:a]volume=1.0[voice];[2:a]volume=0.18[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[audio]',
          '-map', '0:v:0',
          '-map', '[audio]'
        )
      } else {
        args.push('-map', '0:v:0', '-map', '1:a:0')
      }

      args.push(
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        outputName
      )

      await ffmpeg.exec(args)

      const data = await ffmpeg.readFile(outputName)
      if (typeof data === 'string') {
        throw new Error(t("finalMp4Failed"))
      }

      const blob = new Blob([data.buffer as ArrayBuffer], {
        type: 'video/mp4'
      })

      setVideoOutput(URL.createObjectURL(blob))
      setVideoNotice(t("audioMusicSuccess"))

      for (const name of [videoName, voiceName, outputName]) {
        try { await ffmpeg.deleteFile(name) } catch {}
      }
    } catch (error) {
      console.error(error)
      setVideoNotice(t("audioMusicFailed") + String(error))
    } finally {
      setVideoLoading(false)
    }
  }

  const generateAiNarration = async () => {
    const text = aiNarrationText.trim()

    if (!text) {
      setVideoNotice(t("narrationTextMissing"))
      return
    }

    if (text.length > 500) {
      setVideoNotice(t("narrationTextTooLong"))
      return
    }

    setAiNarrationLoading(true)
    setVideoNotice(t("narrationPreparingOnline"))

    try {
      const response = await fetch('https://api.tts.ai/v1/tts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'kokoro',
          text,
          voice: aiNarrationVoice,
          format: 'wav'
        })
      })

      if (!response.ok) {
        throw new Error(`TTS API request failed: ${response.status}`)
      }

      const job = await response.json()

      if (!job.uuid) {
        throw new Error(JSON.stringify(job))
      }

      setVideoNotice(t("narrationCreating"))

      let result: any = null

      for (let attempt = 0; attempt < 45; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000))

        const statusResponse = await fetch(
          `https://api.tts.ai/v1/speech/results/?uuid=${encodeURIComponent(job.uuid)}`
        )

        if (!statusResponse.ok) {
          throw new Error(`TTS status failed: ${statusResponse.status}`)
        }

        result = await statusResponse.json()

        if (result.status === 'completed') break

        if (result.status === 'failed') {
          throw new Error(result.error || 'AI Voice generation failed.')
        }
      }

      if (result?.status !== 'completed' || !result.result_url) {
        throw new Error(t("narrationTimeout"))
      }

      const audioResponse = await fetch(result.result_url)

      if (!audioResponse.ok) {
        throw new Error(t("narrationDownloadFailed"))
      }

      const wavBlob = await audioResponse.blob()

      if (!wavBlob.size) {
        throw new Error(t("narrationEmpty"))
      }

      const file = new File(
        [wavBlob],
        `hello-ai-narration-${Date.now()}.wav`,
        { type: 'audio/wav' }
      )

      if (aiNarrationUrl) URL.revokeObjectURL(aiNarrationUrl)

      setAiNarrationFile(file)
      setAiNarrationUrl(URL.createObjectURL(wavBlob))
      setVideoNotice(t("narrationReady"))
    } catch (error) {
      console.error(error)
      setVideoNotice(t("narrationFailed") + String(error))
    } finally {
      setAiNarrationLoading(false)
    }
  }

  const generateImage = async (promptOverride?: string): Promise<string | null> => {
    const prompt = (promptOverride ?? imagePrompt).trim()
    if (!prompt || imageLoading) return null

    setImageLoading(true)
    setNotice(t("imageGenerating"))

    try {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw authError
      }

      const { data, error } = await supabase.functions.invoke('hello-ai-image', {
        body: { prompt }
      })

      if (error) {
        let detail = error.message
        try {
          const payload = await error.context?.json()
          if (payload?.error) detail = payload.error
        } catch {}
        throw new Error(detail)
      }

      if (!data?.image || !data?.mimeType) {
        throw new Error(data?.error || t("imageNotFound"))
      }

      const imageDataUrl = `data:${data.mimeType};base64,${data.image}`
      setImageMimeType(data.mimeType)
      setGeneratedImage(imageDataUrl)
      setNotice(t("imageSuccess"))
      return imageDataUrl
    } catch (error: any) {
      setNotice(error?.message || t("imageError"))
      return null
    } finally {
      setImageLoading(false)
    }
  }

  const createTextVideo = async () => {
    const prompt = textVideoPrompt.trim()

    if (!prompt || imageLoading || videoLoading) return

    setNotice(t("textVideoStarting"))
    const imageDataUrl = await generateImage(prompt)

    if (!imageDataUrl) return

    try {
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      const extension = blob.type.includes('jpeg') ? 'jpg' :
        blob.type.includes('webp') ? 'webp' : 'png'
      const file = new File(
        [blob],
        `hello-ai-text-video.${extension}`,
        { type: blob.type || 'image/png' }
      )

      setImageFile(file)
      setImageUrl(URL.createObjectURL(file))
      setVideoOutput('')
      setVideoNotice(t("textVideoReady"))

      await createImageVideo(file)
    } catch (error) {
      console.error(error)
      setVideoNotice(t("textVideoFailed") + String(error))
    }
  }

  const translateTextNow = async () => {
    const text = translateText.trim()
    if (!text || translateLoading) return

    if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
      setNotice(t("translationLanguageSame"))
      return
    }

    setTranslateLoading(true)
    setNotice(t("translatingNotice"))
    setTranslation('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw authError
      }

      const { data, error } = await supabase.functions.invoke('hello-ai-chat', {
        body: {
          mode: 'translate',
          text,
          sourceLanguage,
          targetLanguage
        }
      })

      if (error) {
        let detail = error.message
        try {
          const payload = await error.context?.json()
          if (payload?.error) detail = payload.error
        } catch {}
        throw new Error(detail)
      }

      if (!data?.translation) {
        throw new Error(data?.error || t("translationMissing"))
      }

      setTranslation(data.translation)
      setNotice(t("translationSuccessNotice"))
    } catch (error: any) {
      setNotice(error?.message || t("translationFailedNotice"))
    } finally {
      setTranslateLoading(false)
    }
  }


  const generateWriting = async () => {
    const text = writingText.trim()
    if (!text || writingLoading) return

    setWritingLoading(true)
    setWritingResult('')
    setNotice(t("writingStarting"))

    try {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw authError
      }

      const { data, error } = await supabase.functions.invoke('hello-ai-chat', {
        body: {
          mode: 'writing',
          text,
          task: writingTask,
          language
        }
      })

      if (error) {
        let detail = error.message
        try {
          const payload = await error.context?.json()
          if (payload?.error) detail = payload.error
        } catch {}
        throw new Error(detail)
      }

      if (!data?.writing) {
        throw new Error(data?.error || t("writingMissing"))
      }

      setWritingResult(data.writing)
      setNotice(t("writingSuccessNotice"))
    } catch (error: any) {
      setNotice(error?.message || t("writingFailedNotice"))
    } finally {
      setWritingLoading(false)
    }
  }

  const sendMessage = async () => {
    const text = message.trim()
    if (!text || loading) return

    setMessages(previous => [...previous, { role: 'user', content: text }])
    setMessage('')
    setNotice('')
    setLoading(true)

    try {
      let { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        const { error: authError } = await supabase.auth.signInAnonymously()
        if (authError) throw new Error(
          'Anonymous sign-in hin banamne. Supabase Authentication keessatti Anonymous Sign-ins enable godhi.'
        )
        const refreshed = await supabase.auth.getSession()
        sessionData = refreshed.data
      }

      const { data, error } = await supabase.functions.invoke('hello-ai-chat', {
        body: { message: text, language }
      })

      if (error) throw error
      if (!data?.reply) throw new Error(data?.error || 'AI deebii hin kennine.')

      setMessages(previous => [
        ...previous,
        { role: 'assistant', content: data.reply }
      ])
    } catch (error: any) {
      let detail = error?.message || 'Rakkoon uumameera.'
      try {
        const payload = await error?.context?.json()
        if (payload?.error) detail = payload.error
      } catch {}
      setNotice(detail)
    } finally {
      setLoading(false)
    }
  }


  const uiText: Record<string, Record<string, string>> = {
    'om-ET': {
      tagline: 'AI kee. Afaan kee. Addunyaa kee.',
      eyebrow: 'GARGAARAA AI AMMAYYAA',
      welcome: 'Akkam jirtu! 👋',
      welcomeTitle: 'HELLO AI baga nagaan dhuftan.',
      welcomeText: "Gaaffii keessan barreessaa yookaan sagaleedhaan dubbadhaa. Ani isin gargaaruuf qophaa'eera.",
      chat: 'Marii kee',
      emptyTitle: 'Har’a maal siif haa godhu?',
      emptyText: 'Gaaffii kee asitti barreessi.',
      listen: 'Deebii dhaggeeffadhu',
      stop: 'Dhaabi',
      preparing: 'HELLO AI deebii qopheessaa jira...',
      question: 'Gaaffii kee asitti barreessi...',
      voice: 'Sagalee',
      waiting: 'Eegaa...',
      send: 'Ergi',
      tools: 'Meeshaalee AI',
      ask: 'Gaaffii gaafadhu',
      speak: 'Sagaleedhaan dubbadhu',
      makeImage: 'Suuraa uumi',
      makeVideo: 'Viidiyoo uumi',
      makeWriting: 'Barreeffama qopheessi',
      translate: 'Afaan hiiki',
      chatReady: 'AI Chat banameera. Gaaffii kee barreessi.',
      chatMissing: 'Chat hin argamne.',

      videoEditor: 'AI Video Editor',
      videoIntro: 'Viidiyoo bilbila kee keessaa filadhu, ilaali, murii MP4 godhi.',
      textVideo: 'Barruu irraa Viidiyoo Uumi',
      textVideoInfo: "Yaada viidiyoo barbaaddu barreessi. AI suuraa uuma; sana booda MP4 siif qopheessa.",
      textVideoPlaceholder: 'Fakkeenya: Jaldeessi uffata ammayyaa uffatee bosona keessatti deemaa jiru...',
      imageVideo: 'Suuraa gara Viidiyoo',
      imageVideoInfo: 'Suuraa filadhu; sochii zoom fi pan qabuun MP4 uumi.',
      chooseImage: 'Suuraa filadhu',
      videoDuration: 'Dheerina viidiyoo',
      seconds5: 'Sekondii 5',
      seconds10: 'Sekondii 10',
      seconds15: 'Sekondii 15',
      chooseVideo: 'Viidiyoo filadhu',
      chooseSecondVideo: 'Viidiyoo lammaffaa filadhu (Merge)',
      startTime: 'Yeroo jalqabaa (sekondii)',
      endTime: 'Yeroo xumuraa (sekondii)',
      trimVideo: 'Viidiyoo Muri (MP4)',
      mergeVideos: 'Viidiyoo Lama Walitti Maki (MP4)',
      subtitles: 'Subtitle / Barreeffama Viidiyoo',
      subtitleText: 'Barreeffama subtitle',
      subtitlePlaceholder: 'Barreeffama Afaan Oromoo, Amaaraa ykn English galchi...',
      addSubtitle: 'Subtitle MP4 irratti Maxxansi',
      autoSubtitles: 'Subtitle Sagalee irraa Ofumaan Uumi',
      autoSubtitleInfo: 'Sagalee viidiyoo irraa subtitle hanga 10 ofumaan uuma. Bu’aa isaa dura ilaali fi gulaali.',
      createFromAudio: 'Sagalee irraa Subtitle Uumi',
      manySubtitles: 'Subtitle Hedduu (hanga 10)',
      subtitleInstructions: 'Tokkoon tokkoon subtitle sarara haaraa irratti galchi: jalqaba|xumura|barreeffama',
      addMany: 'Subtitle Hedduu MP4 irratti Maxxansi',
      aiNarration: 'AI Voice Narration',
      narrationInfo: 'Barruu English galchi; AI karaa internetii sagalee WAV siif uuma.',
      narrationPlaceholder: 'Barruu English sagaleedhaan dubbifamuu barbaaddu galchi...',
      chooseVoice: 'AI Voice filadhu',
      createWav: 'AI Voice WAV Uumi',
      onlineVoiceNote: 'TTS.ai karaa internetii fayyadama. Barruun hanga 500 characters ta’uu qaba.',
      narrationMusic: 'Sagalee Dubbii fi Muuziqaa',
      recordingBusy: 'Sagalee kee waraabaa jira. Yeroo xumurtu Stop tuqi.',
      recordingFailed: 'Sagalee waraabuu hin dandeenye: ',
      mixVideoMissing: 'Jalqaba viidiyoo MP4 qopheessi.',
      mixNarrationMissing: 'Jalqaba sagalee AI uumi yookaan microphone irraa waraabi.',
      narrationFailed: 'AI Voice uumuu hin dandeenye: ',
      recordVoiceInfo: 'Sagalee dubbii kee microphone irraa waraabi.',
      recordVoice: 'Sagalee Waraabi',
      stopRecording: 'Waraabuu Dhaabi',
      chooseMusic: 'Muuziqaa duubaa filadhu (MP3/WAV)',
      mixAudio: 'Sagalee fi Muuziqaa MP4 irratti Makii',
      downloadMp4: 'MP4 Buufadhu',
      recordReady: 'Sagaleen waraabameera',
      musicSelected: 'Muuziqaan filatameera',
      narrationReady: 'AI WAV qophaa’eera',
      mixBusy: 'Sagalee makaa jira...',
      mixDescription: 'Muuziqaan yoo filatame sagaleen isaa gadi qabama. Yoo muuziqaa hin filanne, sagaleen dubbii qofti MP4 irratti dabalama.',
      videoTextBusy: "AI suuraa uumaa jira...",
      trimBusy: "Viidiyoo muramaa jira. Bilbila hin cufin...",
      mergeBusy: "Viidiyoo lamaan walitti makamaa jiru. Maaloo eegi...",
      makeTextVideo: "Text-to-Video Uumi",
      imageVideoBusy: "Viidiyoo uumamaa jira...",
      imageToMp4: "Suuraa irraa MP4 Uumi",
      imageFileOnly: "Faayilii suuraa qofa filadhu.",
      imageTooLarge: "Suuraan 20 MB gadi ta’uu qaba.",
      imageSelected: "Suuraan filatameera.",
      subtitleBusy: "Subtitle maxxansamaa jira...",
      autoSubtitleBusy: "Sagalee qorachaa jira...",
      multiSubtitleBusy: "Subtitle hedduu maxxansamaa jira...",
      narrationBusy: "AI Voice uumamaa jira...",
      imageTitle: "AI Image – Suuraa Uumi",
      imageInfo: "Suuraa barbaaddu Afaan Oromoo, Amaariffaa ykn English ibsi.",
      imagePlaceholder: "Fakkeenya: Suuraa nama tokkoo tulluu bareedaa irratti dhaabbatu uumi...",
      generateImageBusy: "Suuraa uumamaa jira...",
      generateImage: "Suuraa Uumi",
      downloadImage: "Suuraa Buufadhu",
      imageAlt: "Suuraa HELLO AI uume",
      imageGenerating: "Suuraa uumamaa jira. Mee xiqqoo eegi...",
      imageNotFound: "Suuraa argachuu hin dandeenye.",
      imageSuccess: "Suuraan milkaa’inaan uumameera!",
      imageError: "Suuraa uumuu irratti rakkoon uumameera.",
      textVideoStarting: "Barruu kee irraa suuraa AI uumamaa jira...",
      textVideoReady: "Suuraan AI uumameera. Amma MP4 qopheessaa jira...",
      textVideoFailed: "Text-to-Video hin milkoofne: ",
      writingTitle: 'AI Writing – Barreeffama Qopheessi',
      writingInfo: 'Hojii barbaaddu filadhu; yaada kee Afaan Oromoo, Amaariffaa ykn English galchi.',
      writingTask: 'Gosa hojii',
      writingCreate: 'Barreeffama haaraa uumi',
      writingImprove: 'Barreeffama fooyyessi',
      writingCorrect: 'Dogoggora sirreessi',
      writingSummarize: 'Gabaabsi',
      writingOutline: 'Karoora barreeffamaa qopheessi',
      writingEmail: 'Email barreessi',
      writingSocial: 'Social media post qopheessi',
      writingPlaceholder: 'Mata-duree, yaada ykn barreeffama kee asitti galchi...',
      writingBusy: 'Barreeffamaa jira...',
      writingSubmit: 'Barreeffama Qopheessi',
      writingResult: "Bu'aa AI Writing",
      writingCopied: 'Barreeffamni copy ta’eera.',
      copyFailed: 'Copy gochuun hin milkoofne.',
      writingCopy: 'Barreeffama Copy Godhi',
      translateTitle: 'AI Translate – Afaan Hiiki',
      translateInfo: 'Barreeffama kee galchi; afaan itti hiikamu filadhu.',
      sourceLanguage: 'Afaan jalqabaa',
      autoDetect: 'Ofumaan adda baasi',
      targetLanguage: 'Afaan itti hiikamu',
      translatePlaceholder: 'Barreeffama hiikuu barbaaddu asitti galchi...',
      translateBusy: 'Hiikamaa jira...',
      translateSubmit: 'Amma Hiiki',
      translationResult: 'Hiikkaa',
      translationCopied: 'Hiikkaan copy ta’eera.',
      translationCopy: 'Hiikkaa Copy Godhi',
      imageVideoAlt: 'Suuraa gara viidiyoo jijjiiramu',
      voiceUnsupported: 'Browser kee sagalee galmeessuu hin deeggaru. Google Chrome yaali.',
      voiceListening: 'Amma dubbadhu. HELLO AI si dhaggeeffachaa jira...',
      voiceConverted: 'Sagaleen gara barreeffamaatti jijjiirameera. Amma Ergi tuqi.',
      microphonePermission: 'Hayyama microphone kenni.',
      voiceFailed: 'Sagalee galmeessuu hin dandeenye. Irra deebi’i.',
      microphoneStartFailed: 'Microphone jalqabuu hin dandeenye. Irra deebi’i.',
      speechUnsupported: 'Browser kee dubbisa sagalee hin deeggaru.',
      speechReadFailed: 'Sagalee dubbisuu hin dandeenye. Voice browser kee ilaali.',
      translationLanguageSame: 'Afaan jalqabaa fi afaan hiikkaa adda ta’uu qabu.',
      translatingNotice: 'Hiikamaa jira. Mee xiqqoo eegi...',
      translationSuccessNotice: 'Hiikkaan milkaa’inaan xumurameera!',
      translationMissing: 'Hiikkaa argachuu hin dandeenye.',
      translationFailedNotice: 'Hiikkaa irratti rakkoon uumameera.',
      writingStarting: 'AI Writing barreeffama qopheessaa jira...',
      writingSuccessNotice: 'Barreeffamni milkaa’inaan qophaa’eera!',
      writingMissing: 'Barreeffama argachuu hin dandeenye.',
      writingFailedNotice: 'AI Writing irratti rakkoon uumameera.',
      videoFileOnly: 'Faayilii viidiyoo qofa filadhu.',
      videoTooLarge: 'Viidiyoon 100 MB gadi ta’uu qaba. Viidiyoo gabaabaa yaali.',
      videoSelected: 'Viidiyoon filatameera. Yeroo murteessi.',
      secondVideoTooLarge: 'Viidiyoon lammaffaan 100 MB gadi ta’uu qaba.',
      secondVideoSelected: 'Viidiyoon lammaffaan filatameera.',
      imageFileMissing: 'Jalqaba suuraa filadhu.',
      imageDurationInvalid: 'Yeroo 5, 10 ykn 15 sekondii filadhu.',
      ffmpegPreparing: 'FFmpeg qophaa’aa jira. Maaloo eegi...',

      imageVideoConverting: 'Suuraa gara viidiyoo MP4 tti jijjiiraa jira...',
      trimTimeInvalid: 'Yeroo jalqabaa fi xumuraa sirreessi.',
      trimSuccess: 'Viidiyoon MP4 milkaa’inaan qophaa’eera!',
      trimFailed: 'Viidiyoo muruu hin dandeenye. Dogoggora: ',
      mergeFilesMissing: 'Viidiyoo lamaan filadhu.',
      mergePreparing: 'Viidiyoo lama walitti makuuf qophaa’aa jira...',
      mergeLoading: 'Viidiyoo lamaan gara FFmpeg galchaa jira...',
      mergeSuccess: 'Viidiyoonni lamaan MP4 tokko keessatti milkaa’inaan walitti makamaniiru!',
      mergeFailed: 'Walitti makuun hin milkoofne. Viidiyoo gabaabaa lama yaali. Dogoggora: ',
      videoFileMissing: 'Jalqaba viidiyoo filadhu.',
      imageVideoSuccess: 'Suuraan gara viidiyoo MP4 tti milkaa’inaan jijjiirameera!',
      imageVideoFailed: 'Suuraa gara viidiyoo jijjiiruun hin milkoofne: ',
      subtitleExtracting: 'Sagalee viidiyoo keessaa baasaa jira...',
      subtitleTranscribing: 'Whisper AI sagalee dhaggeeffatee subtitle barreessaa jira...',
      subtitleSuccess: 'Subtitle ofumaan uumameera! Barruu ilaali, gulaali, achiis MP4 irratti maxxansi.',
      subtitleFailed: 'Subtitle ofumaan uumuu hin milkoofne: ',
      audioVideoDownloadFailed: 'Viidiyoo buufachuun hin danda’amne.',
      finalMp4Failed: 'MP4 xumuraa uumuu hin danda’amne.',
      audioMusicSuccess: 'Sagalee fi muuziqaan MP4 irratti milkaa’inaan makamaniiru!',
      audioMusicFailed: 'Sagalee fi muuziqaa walitti makuun hin milkoofne: ',
      narrationTextMissing: 'Barruu English dubbifamuu galchi.',
      narrationTextTooLong: 'Barruun yeroo tokkootti character 500 caaluu hin qabu.',
      narrationPreparingOnline: 'AI Voice online qopheessaa jira. Mee eegi...',
      narrationCreating: 'AI Voice uumamaa jira. Mee eegi...',
      narrationTimeout: 'AI Voice yeroo eegame keessatti hin xumuramne.',
      narrationDownloadFailed: 'WAV audio buusuun hin milkoofne.',
      narrationEmpty: 'WAV audio duwwaa dha.',
      captionTextInvalid: 'Barreeffama galchi; yeroo sirreessi.',
      canvasUnavailable: 'Canvas hin banamne.',
      videoMetadataFailed: 'Bal’inni fi dheerinni viidiyoo hin dubbifamne.',
      videoDurationInvalid: 'Dheerinni viidiyoo sirrii miti.',
      videoMp4Invalid: 'MP4 sirrii hin uumamne.',
      videoAudioInvalid: 'Sagalee WAV dubbisuu hin dandeenye.',
      videoSpeechMissing: 'Sagalee keessatti dubbii argachuu hin dandeenye.',
      subtitleTimeInvalid: 'Yeroo subtitle sirrii hin argamne.',
      videoDurationMissing: 'Dheerinni viidiyoo hin dubbifamne.',
      videoFooter: 'Viidiyoo hanga 100 MB qofa yaali. Qophiin jalqabaa internet barbaada; yeroo itti aanu FFmpeg browser keessatti kuufame fayyadama.'
    },
    'am-ET': {
      tagline: 'የእርስዎ AI። ቋንቋዎ። ዓለምዎ።',
      eyebrow: 'ዘመናዊ AI ረዳት',
      welcome: 'እንዴት ነዎት! 👋',
      welcomeTitle: 'ወደ HELLO AI በደህና መጡ።',
      welcomeText: 'ጥያቄዎን በጽሑፍ ወይም በድምፅ ያቅርቡ። እኔ ለመርዳት ዝግጁ ነኝ።',
      chat: 'ውይይት',
      emptyTitle: 'ዛሬ ምን ልርዳዎት?',
      emptyText: 'ጥያቄዎን እዚህ ይጻፉ።',
      listen: 'መልሱን ያዳምጡ',
      stop: 'አቁም',
      preparing: 'HELLO AI መልስ እያዘጋጀ ነው...',
      question: 'ጥያቄዎን እዚህ ይጻፉ...',
      voice: 'ድምፅ',
      waiting: 'ይጠብቁ...',
      send: 'ላክ',
      tools: 'የ AI መሣሪያዎች',
      ask: 'ጥያቄ ይጠይቁ',
      speak: 'በድምፅ ይናገሩ',
      makeImage: 'ምስል ይፍጠሩ',
      makeVideo: 'ቪዲዮ ይፍጠሩ',
      makeWriting: 'ጽሑፍ ያዘጋጁ',
      translate: 'ተርጉም',
      chatReady: 'AI Chat ተከፍቷል። ጥያቄዎን ይጻፉ።',
      chatMissing: 'Chat አልተገኘም።',

      videoEditor: 'AI ቪዲዮ አርታዒ',
      videoIntro: 'ከስልክዎ ቪዲዮ ይምረጡ፣ ይመልከቱ፣ ይቁረጡ እና MP4 ያድርጉ።',
      textVideo: 'ከጽሑፍ ቪዲዮ ፍጠር',
      textVideoInfo: 'የሚፈልጉትን ቪዲዮ ሀሳብ ይጻፉ። AI ምስል ይፈጥራል፣ ከዚያ MP4 ያዘጋጃል።',
      textVideoPlaceholder: 'ምሳሌ፦ ዘመናዊ ልብስ የለበሰ ዝንጀሮ በጫካ ውስጥ እየተራመደ ነው...',
      imageVideo: 'ምስልን ወደ ቪዲዮ',
      imageVideoInfo: 'ምስል ይምረጡ፤ zoom እና pan እንቅስቃሴ ያለው MP4 ይፍጠሩ።',
      chooseImage: 'ምስል ይምረጡ',
      videoDuration: 'የቪዲዮ ቆይታ',
      seconds5: '5 ሰከንድ',
      seconds10: '10 ሰከንድ',
      seconds15: '15 ሰከንድ',
      chooseVideo: 'ቪዲዮ ይምረጡ',
      chooseSecondVideo: 'ሁለተኛ ቪዲዮ ይምረጡ',
      startTime: 'የመጀመሪያ ጊዜ (ሰከንድ)',
      endTime: 'የመጨረሻ ጊዜ (ሰከንድ)',
      trimVideo: 'ቪዲዮ ቁረጥ (MP4)',
      mergeVideos: 'ሁለት ቪዲዮዎችን አዋህድ',
      subtitles: 'የቪዲዮ ጽሑፎች (Subtitles)',
      subtitleText: 'የSubtitle ጽሑፍ',
      subtitlePlaceholder: 'አፋን ኦሮሞ፣ አማርኛ ወይም English ጽሑፍ ያስገቡ...',
      addSubtitle: 'Subtitle በMP4 ላይ ጨምር',
      autoSubtitles: 'ከድምፅ Subtitle በራስ-ሰር ፍጠር',
      autoSubtitleInfo: 'ከቪዲዮው ድምፅ እስከ 10 subtitle በራስ-ሰር ይፈጥራል። ውጤቱን ይመልከቱና ያርሙ።',
      createFromAudio: 'ከድምፅ Subtitle ፍጠር',
      manySubtitles: 'ብዙ Subtitles (እስከ 10)',
      subtitleInstructions: 'እያንዳንዱን subtitle በአዲስ መስመር ያስገቡ: መጀመሪያ|መጨረሻ|ጽሑፍ',
      addMany: 'ብዙ Subtitles በMP4 ላይ ጨምር',
      aiNarration: 'AI የድምፅ ትረካ',
      narrationInfo: 'English ጽሑፍ ያስገቡ፤ AI በኢንተርኔት WAV ድምፅ ይፈጥራል።',
      narrationPlaceholder: 'AI እንዲያነበው የሚፈልጉትን English ጽሑፍ ያስገቡ...',
      chooseVoice: 'AI ድምፅ ይምረጡ',
      createWav: 'AI Voice WAV ፍጠር',
      onlineVoiceNote: 'TTS.ai በኢንተርኔት ይሰራል። ጽሑፉ እስከ 500 ቁምፊዎች መሆን አለበት።',
      narrationMusic: 'የድምፅ ትረካ እና ሙዚቃ',
      recordingBusy: 'ድምፅዎን በመቅረጽ ላይ ነው። ሲጨርሱ Stop ይጫኑ።',
      recordingFailed: 'ድምፅ መቅረጽ አልተቻለም፦ ',
      mixVideoMissing: 'መጀመሪያ MP4 ቪዲዮ ያዘጋጁ።',
      mixNarrationMissing: 'መጀመሪያ AI Voice ይፍጠሩ ወይም በማይክሮፎን ድምፅ ይቅረጹ።',
      narrationFailed: 'AI Voice መፍጠር አልተቻለም፦ ',
      recordVoiceInfo: 'የራስዎን ድምፅ በማይክሮፎን ይቅረጹ።',
      recordVoice: 'ድምፅ ቅረጽ',
      stopRecording: 'ቀረጻውን አቁም',
      chooseMusic: 'የጀርባ ሙዚቃ ይምረጡ',
      mixAudio: 'ድምፅና ሙዚቃ በMP4 ላይ አዋህድ',
      downloadMp4: 'MP4 አውርድ',
      recordReady: 'ድምፁ ተቀርጿል',
      musicSelected: 'ሙዚቃው ተመርጧል',
      narrationReady: 'AI WAV ተዘጋጅቷል',
      mixBusy: 'ድምፅ በማዋሃድ ላይ...',
      mixDescription: 'ሙዚቃ ከተመረጠ ድምፁ ይቀነሳል። ሙዚቃ ካልተመረጠ የድምፅ ቀረጻው ብቻ ወደ MP4 ይጨመራል።',
      videoTextBusy: "AI ምስል በመፍጠር ላይ...",
      trimBusy: "ቪዲዮውን በመቁረጥ ላይ ነው። ስልኩን አያጥፉ...",
      mergeBusy: "ሁለቱን ቪዲዮዎች በማዋሃድ ላይ ነው። እባክዎ ይጠብቁ...",
      makeTextVideo: "ጽሑፍን ወደ ቪዲዮ ቀይር",
      imageVideoBusy: "ቪዲዮ በመፍጠር ላይ...",
      imageToMp4: "ከምስል MP4 ፍጠር",
      imageFileOnly: "እባክዎ የምስል ፋይል ብቻ ይምረጡ።",
      imageTooLarge: "ምስሉ ከ20 MB በታች መሆን አለበት።",
      imageSelected: "ምስሉ ተመርጧል።",
      subtitleBusy: "ንዑስ ጽሑፍ በመጨመር ላይ...",
      autoSubtitleBusy: "ድምፅን በመተንተን ላይ...",
      multiSubtitleBusy: "ብዙ ንዑስ ጽሑፎችን በመጨመር ላይ...",
      narrationBusy: "AI Voice በመፍጠር ላይ...",
      imageTitle: "AI Image – ምስል ይፍጠሩ",
      imageInfo: "የሚፈልጉትን ምስል በኦሮምኛ፣ በአማርኛ ወይም በEnglish ይግለጹ።",
      imagePlaceholder: "ምሳሌ፦ በውብ ተራራ ላይ የቆመ ሰው ምስል ፍጠር...",
      generateImageBusy: "ምስል በመፍጠር ላይ...",
      generateImage: "ምስል ይፍጠሩ",
      downloadImage: "ምስሉን ያውርዱ",
      imageAlt: "በHELLO AI የተፈጠረ ምስል",
      imageGenerating: "ምስል በመፍጠር ላይ። እባክዎ ትንሽ ይጠብቁ...",
      imageNotFound: "ምስሉን ማግኘት አልተቻለም።",
      imageSuccess: "ምስሉ በተሳካ ሁኔታ ተፈጥሯል!",
      imageError: "ምስል በመፍጠር ላይ ችግር ተፈጥሯል።",
      textVideoStarting: "ከጽሑፍዎ AI ምስል በመፍጠር ላይ...",
      textVideoReady: "AI ምስሉ ተፈጥሯል። MP4 አሁን በማዘጋጀት ላይ...",
      textVideoFailed: "Text-to-Video አልተሳካም: ",
      writingTitle: 'AI Writing – ጽሑፍ ያዘጋጁ',
      writingInfo: 'የሚፈልጉትን ሥራ ይምረጡ፤ ሐሳብዎን በኦሮምኛ፣ በአማርኛ ወይም በእንግሊዝኛ ያስገቡ።',
      writingTask: 'የሥራ ዓይነት',
      writingCreate: 'አዲስ ጽሑፍ ይፍጠሩ',
      writingImprove: 'ጽሑፍን ያሻሽሉ',
      writingCorrect: 'ስህተት ያርሙ',
      writingSummarize: 'ያጠቃልሉ',
      writingOutline: 'የጽሑፍ እቅድ ያዘጋጁ',
      writingEmail: 'ኢሜይል ይጻፉ',
      writingSocial: 'የማህበራዊ ሚዲያ ጽሑፍ ያዘጋጁ',
      writingPlaceholder: 'ርዕስዎን፣ ሐሳብዎን ወይም ጽሑፍዎን እዚህ ያስገቡ...',
      writingBusy: 'ጽሑፍ እየተዘጋጀ ነው...',
      writingSubmit: 'ጽሑፍ ያዘጋጁ',
      writingResult: 'የAI Writing ውጤት',
      writingCopied: 'ጽሑፉ ተቀድቷል።',
      copyFailed: 'መቅዳት አልተሳካም።',
      writingCopy: 'ጽሑፍ ቅዳ',
      translateTitle: 'AI Translate – ተርጉም',
      translateInfo: 'ጽሑፍዎን ያስገቡ፤ የሚተረጎምበትን ቋንቋ ይምረጡ።',
      sourceLanguage: 'የመነሻ ቋንቋ',
      autoDetect: 'በራስ-ሰር ለይ',
      targetLanguage: 'የመድረሻ ቋንቋ',
      translatePlaceholder: 'መተርጎም የሚፈልጉትን ጽሑፍ እዚህ ያስገቡ...',
      translateBusy: 'እየተተረጎመ ነው...',
      translateSubmit: 'አሁን ተርጉም',
      translationResult: 'ትርጉም',
      translationCopied: 'ትርጉሙ ተቀድቷል።',
      translationCopy: 'ትርጉም ቅዳ',
      imageVideoAlt: 'ምስልን ወደ ቪዲዮ መቀየር',
      voiceUnsupported: 'አሳሽዎ የድምፅ ቅጂን አይደግፍም። Google Chrome ይሞክሩ።',
      voiceListening: 'አሁን ይናገሩ። HELLO AI እያዳመጠዎት ነው...',
      voiceConverted: 'ድምፁ ወደ ጽሑፍ ተቀይሯል። አሁን ላክን ይጫኑ።',
      microphonePermission: 'የማይክሮፎን ፈቃድ ይስጡ።',
      voiceFailed: 'ድምፅን መቅረጽ አልተቻለም። እንደገና ይሞክሩ።',
      microphoneStartFailed: 'ማይክሮፎኑን ማስጀመር አልተቻለም። እንደገና ይሞክሩ።',
      speechUnsupported: 'አሳሽዎ የድምፅ ንባብን አይደግፍም።',
      speechReadFailed: 'ድምፅን ማንበብ አልተቻለም። የአሳሽዎን Voice ያረጋግጡ።',
      translationLanguageSame: 'የመነሻና የመድረሻ ቋንቋዎች የተለያዩ መሆን አለባቸው።',
      translatingNotice: 'በመተርጎም ላይ ነው። እባክዎ ትንሽ ይጠብቁ...',
      translationSuccessNotice: 'ትርጉሙ በተሳካ ሁኔታ ተጠናቋል!',
      translationMissing: 'ትርጉሙን ማግኘት አልተቻለም።',
      translationFailedNotice: 'በትርጉሙ ላይ ችግር ተፈጥሯል።',
      writingStarting: 'AI Writing ጽሑፍ በማዘጋጀት ላይ ነው...',
      writingSuccessNotice: 'ጽሑፉ በተሳካ ሁኔታ ተዘጋጅቷል!',
      writingMissing: 'ጽሑፉን ማግኘት አልተቻለም።',
      writingFailedNotice: 'በAI Writing ላይ ችግር ተፈጥሯል።',
      videoFileOnly: 'የቪዲዮ ፋይል ብቻ ይምረጡ።',
      videoTooLarge: 'ቪዲዮው ከ100 MB በታች መሆን አለበት። አጭር ቪዲዮ ይሞክሩ።',
      videoSelected: 'ቪዲዮው ተመርጧል። ጊዜውን ያስተካክሉ።',
      secondVideoTooLarge: 'ሁለተኛው ቪዲዮ ከ100 MB በታች መሆን አለበት።',
      secondVideoSelected: 'ሁለተኛው ቪዲዮ ተመርጧል።',
      imageFileMissing: 'መጀመሪያ ምስል ይምረጡ።',
      imageDurationInvalid: '5፣ 10 ወይም 15 ሰከንድ ይምረጡ።',
      ffmpegPreparing: 'FFmpeg በማዘጋጀት ላይ ነው። እባክዎ ይጠብቁ...',

      imageVideoConverting: 'ምስሉን ወደ MP4 ቪዲዮ በመቀየር ላይ...',
      trimTimeInvalid: 'የመጀመሪያ እና የመጨረሻ ጊዜን ያስተካክሉ።',
      trimSuccess: 'MP4 ቪዲዮው በተሳካ ሁኔታ ተዘጋጅቷል!',
      trimFailed: 'ቪዲዮውን መቁረጥ አልተቻለም። ስህተት: ',
      mergeFilesMissing: 'ሁለቱን ቪዲዮዎች ይምረጡ።',
      mergePreparing: 'ሁለት ቪዲዮዎችን ለማዋሃድ በማዘጋጀት ላይ...',
      mergeLoading: 'ሁለቱን ቪዲዮዎች ወደ FFmpeg በማስገባት ላይ...',
      mergeSuccess: 'ሁለቱ ቪዲዮዎች በአንድ MP4 ውስጥ በተሳካ ሁኔታ ተዋህደዋል!',
      mergeFailed: 'ማዋሃድ አልተሳካም። ሁለት አጭር ቪዲዮዎችን ይሞክሩ። ስህተት: ',
      videoFileMissing: 'መጀመሪያ ቪዲዮ ይምረጡ።',
      imageVideoSuccess: 'ምስሉ ወደ MP4 ቪዲዮ በተሳካ ሁኔታ ተቀይሯል!',
      imageVideoFailed: 'ምስሉን ወደ ቪዲዮ መቀየር አልተሳካም: ',
      subtitleExtracting: 'ከቪዲዮው ውስጥ ድምፅ በማውጣት ላይ...',
      subtitleTranscribing: 'Whisper AI ድምፁን በማዳመጥ ንዑስ ርዕስ በመጻፍ ላይ...',
      subtitleSuccess: 'ንዑስ ርዕሱ በራስ-ሰር ተፈጥሯል! ጽሑፉን ይመልከቱ፣ ያርሙና MP4 ላይ ይጨምሩ።',
      subtitleFailed: 'ንዑስ ርዕስን በራስ-ሰር መፍጠር አልተሳካም: ',
      audioVideoDownloadFailed: 'ቪዲዮውን ማውረድ አልተቻለም።',
      finalMp4Failed: 'የመጨረሻውን MP4 መፍጠር አልተቻለም።',
      audioMusicSuccess: 'ድምፅና ሙዚቃ በMP4 ላይ በተሳካ ሁኔታ ተቀላቅለዋል!',
      audioMusicFailed: 'ድምፅና ሙዚቃን ማቀላቀል አልተሳካም: ',
      narrationTextMissing: 'የሚነበብ የእንግሊዝኛ ጽሑፍ ያስገቡ።',
      narrationTextTooLong: 'ጽሑፉ በአንድ ጊዜ ከ500 ቁምፊዎች መብለጥ የለበትም።',
      narrationPreparingOnline: 'AI Voice በመስመር ላይ በማዘጋጀት ላይ። እባክዎ ይጠብቁ...',
      narrationCreating: 'AI Voice በመፍጠር ላይ። እባክዎ ይጠብቁ...',
      narrationTimeout: 'AI Voice በተወሰነው ጊዜ ውስጥ አልተጠናቀቀም።',
      narrationDownloadFailed: 'WAV audio ማውረድ አልተሳካም።',
      narrationEmpty: 'WAV audio ባዶ ነው።',
      captionTextInvalid: 'ጽሑፍ ያስገቡ፤ ጊዜውንም ያስተካክሉ።',
      canvasUnavailable: 'Canvas መክፈት አልተቻለም።',
      videoMetadataFailed: 'የቪዲዮውን ስፋትና ቆይታ ማንበብ አልተቻለም።',
      videoDurationInvalid: 'የቪዲዮው ቆይታ ትክክል አይደለም።',
      videoMp4Invalid: 'ትክክለኛ MP4 መፍጠር አልተቻለም።',
      videoAudioInvalid: 'WAV ድምፅን ማንበብ አልተቻለም።',
      videoSpeechMissing: 'በድምፁ ውስጥ ንግግር አልተገኘም።',
      subtitleTimeInvalid: 'የንዑስ ርዕስ ጊዜ ትክክል አይደለም።',
      videoDurationMissing: 'የቪዲዮውን ቆይታ ማንበብ አልተቻለም።',
      videoFooter: 'እስከ 100 MB የሚደርስ ቪዲዮ ብቻ ይጠቀሙ። የመጀመሪያው ዝግጅት ኢንተርኔት ይፈልጋል። በኋላ FFmpeg በbrowser ውስጥ የተቀመጠውን ይጠቀማል።'
    },
    'en-US': {
      tagline: 'Your AI. Your Language. Your World.',
      eyebrow: 'SMART AI ASSISTANT',
      welcome: 'Hello! 👋',
      welcomeTitle: 'Welcome to HELLO AI.',
      welcomeText: 'Type your question or speak using your voice. I am ready to help you.',
      chat: 'Your Chat',
      emptyTitle: 'What can I do for you today?',
      emptyText: 'Type your question here.',
      listen: 'Listen to reply',
      stop: 'Stop',
      preparing: 'HELLO AI is preparing a reply...',
      question: 'Type your question here...',
      voice: 'Voice',
      waiting: 'Waiting...',
      send: 'Send',
      tools: 'AI Tools',
      ask: 'Ask a question',
      speak: 'Speak using your voice',
      makeImage: 'Create an image',
      makeVideo: 'Create a video',
      makeWriting: 'Prepare text',
      translate: 'Translate languages',
      chatReady: 'AI Chat is ready. Type your question.',
      chatMissing: 'Chat was not found.',

      videoEditor: 'AI Video Editor',
      videoIntro: 'Choose a video from your phone, preview it, trim it and export MP4.',
      textVideo: 'Automatic Text-to-Video',
      textVideoInfo: 'Describe the video you want. AI creates an image and then prepares an MP4.',
      textVideoPlaceholder: 'Example: A monkey wearing modern clothes walking in a forest...',
      imageVideo: 'Image-to-Video',
      imageVideoInfo: 'Choose an image and create an MP4 with zoom and pan motion.',
      chooseImage: 'Choose an image',
      videoDuration: 'Video duration',
      seconds5: '5 seconds',
      seconds10: '10 seconds',
      seconds15: '15 seconds',
      chooseVideo: 'Choose a video',
      chooseSecondVideo: 'Choose a second video',
      startTime: 'Start time (seconds)',
      endTime: 'End time (seconds)',
      trimVideo: 'Trim Video (MP4)',
      mergeVideos: 'Merge Two Videos (MP4)',
      subtitles: 'Subtitles / Video Captions',
      subtitleText: 'Subtitle text',
      subtitlePlaceholder: 'Enter Afaan Oromoo, Amharic or English text...',
      addSubtitle: 'Burn Subtitle into MP4',
      autoSubtitles: 'Automatic Speech-to-Text Subtitles',
      autoSubtitleInfo: 'Automatically creates up to 10 subtitles from the video audio. Review and edit the result first.',
      createFromAudio: 'Create Subtitles from Audio',
      manySubtitles: 'Multiple Subtitles (up to 10)',
      subtitleInstructions: 'Enter each subtitle on a new line: start|end|text',
      addMany: 'Burn Multiple Subtitles into MP4',
      aiNarration: 'AI Voice Narration',
      narrationInfo: 'Enter English text; AI generates a WAV voice online.',
      narrationPlaceholder: 'Enter the English text you want the AI voice to speak...',
      chooseVoice: 'Choose AI Voice',
      createWav: 'Generate AI Voice WAV',
      onlineVoiceNote: 'Uses TTS.ai online. Text must be 500 characters or fewer. Internet is required.',
      narrationMusic: 'Voice Narration & Music',
      recordingBusy: 'Recording your voice. Tap Stop when finished.',
      recordingFailed: 'Could not record voice: ',
      mixVideoMissing: 'Please prepare an MP4 video first.',
      mixNarrationMissing: 'Generate AI Voice or record your voice using the microphone first.',
      narrationFailed: 'Could not generate AI Voice: ',
      recordVoiceInfo: 'Record your voice using the microphone.',
      recordVoice: 'Record Voice',
      stopRecording: 'Stop Recording',
      chooseMusic: 'Choose background music (MP3/WAV)',
      mixAudio: 'Mix Voice and Music into MP4',
      downloadMp4: 'Download MP4',
      recordReady: 'Voice recorded',
      musicSelected: 'Music selected',
      narrationReady: 'AI WAV is ready',
      mixBusy: 'Mixing audio...',
      mixDescription: 'When music is selected, its volume is lowered. Without music, only the recorded voice is added to the MP4.',
      videoTextBusy: "AI is generating an image...",
      trimBusy: "Trimming video. Do not close the app...",
      mergeBusy: "Merging both videos. Please wait...",
      makeTextVideo: "Create Text-to-Video",
      imageVideoBusy: "Creating video...",
      imageToMp4: "Create MP4 from Image",
      imageFileOnly: "Please select an image file only.",
      imageTooLarge: "The image must be smaller than 20 MB.",
      imageSelected: "Image selected.",
      subtitleBusy: "Adding subtitle...",
      autoSubtitleBusy: "Analyzing audio...",
      multiSubtitleBusy: "Adding multiple subtitles...",
      narrationBusy: "Generating AI Voice...",
      imageTitle: "AI Image – Create an Image",
      imageInfo: "Describe the image you want in Afaan Oromoo, Amharic, or English.",
      imagePlaceholder: "Example: Create an image of a person standing on a beautiful mountain...",
      generateImageBusy: "Generating image...",
      generateImage: "Create Image",
      downloadImage: "Download Image",
      imageAlt: "Image generated by HELLO AI",
      imageGenerating: "Generating image. Please wait...",
      imageNotFound: "Could not retrieve the image.",
      imageSuccess: "Image generated successfully!",
      imageError: "There was a problem generating the image.",
      textVideoStarting: "Generating an AI image from your text...",
      textVideoReady: "AI image created. Preparing MP4 now...",
      textVideoFailed: "Text-to-Video failed: ",
      writingTitle: 'AI Writing – Create Text',
      writingInfo: 'Choose the task you need; enter your idea in Afaan Oromoo, Amharic, or English.',
      writingTask: 'Task type',
      writingCreate: 'Create new text',
      writingImprove: 'Improve text',
      writingCorrect: 'Correct mistakes',
      writingSummarize: 'Summarize',
      writingOutline: 'Create an outline',
      writingEmail: 'Write an email',
      writingSocial: 'Create a social media post',
      writingPlaceholder: 'Enter your topic, idea, or text here...',
      writingBusy: 'Writing...',
      writingSubmit: 'Generate Text',
      writingResult: 'AI Writing Result',
      writingCopied: 'Text copied.',
      copyFailed: 'Copy failed.',
      writingCopy: 'Copy Text',
      translateTitle: 'AI Translate – Translate Text',
      translateInfo: 'Enter your text and choose the target language.',
      sourceLanguage: 'Source language',
      autoDetect: 'Detect automatically',
      targetLanguage: 'Target language',
      translatePlaceholder: 'Enter the text you want to translate here...',
      translateBusy: 'Translating...',
      translateSubmit: 'Translate Now',
      translationResult: 'Translation',
      translationCopied: 'Translation copied.',
      translationCopy: 'Copy Translation',
      imageVideoAlt: 'Convert image to video',
      voiceUnsupported: 'Your browser does not support voice recording. Try Google Chrome.',
      voiceListening: 'Speak now. HELLO AI is listening...',
      voiceConverted: 'Voice has been converted to text. Tap Send now.',
      microphonePermission: 'Please allow microphone access.',
      voiceFailed: 'Could not record voice. Please try again.',
      microphoneStartFailed: 'Could not start the microphone. Please try again.',
      speechUnsupported: 'Your browser does not support speech playback.',
      speechReadFailed: "Could not play the voice. Check your browser's voice support.",
      translationLanguageSame: 'The source and target languages must be different.',
      translatingNotice: 'Translating. Please wait...',
      translationSuccessNotice: 'Translation completed successfully!',
      translationMissing: 'Could not get the translation.',
      translationFailedNotice: 'A problem occurred during translation.',
      writingStarting: 'AI Writing is preparing your text...',
      writingSuccessNotice: 'Your text has been prepared successfully!',
      writingMissing: 'Could not get the generated text.',
      writingFailedNotice: 'A problem occurred with AI Writing.',
      videoFileOnly: 'Please select a video file only.',
      videoTooLarge: 'The video must be under 100 MB. Try a shorter video.',
      videoSelected: 'Video selected. Set the duration.',
      secondVideoTooLarge: 'The second video must be under 100 MB.',
      secondVideoSelected: 'The second video has been selected.',
      imageFileMissing: 'Please select an image first.',
      imageDurationInvalid: 'Select 5, 10, or 15 seconds.',
      ffmpegPreparing: 'Preparing FFmpeg. Please wait...',

      imageVideoConverting: 'Converting image to MP4 video...',
      trimTimeInvalid: 'Please correct the start and end times.',
      trimSuccess: 'MP4 video created successfully!',
      trimFailed: 'Could not trim the video. Error: ',
      mergeFilesMissing: 'Please select both videos.',
      mergePreparing: 'Preparing to merge two videos...',
      mergeLoading: 'Loading both videos into FFmpeg...',
      mergeSuccess: 'Both videos were successfully merged into one MP4!',
      mergeFailed: 'Merging failed. Try two shorter videos. Error: ',
      videoFileMissing: 'Please select a video first.',
      imageVideoSuccess: 'The image was successfully converted to an MP4 video!',
      imageVideoFailed: 'Image-to-Video conversion failed: ',
      subtitleExtracting: 'Extracting audio from the video...',
      subtitleTranscribing: 'Whisper AI is listening to the audio and generating subtitles...',
      subtitleSuccess: 'Subtitles generated automatically! Review and edit the text, then apply it to the MP4.',
      subtitleFailed: 'Automatic subtitle generation failed: ',
      audioVideoDownloadFailed: 'Could not download the video.',
      finalMp4Failed: 'Could not create the final MP4.',
      audioMusicSuccess: 'Audio and music were successfully combined in the MP4!',
      audioMusicFailed: 'Could not combine audio and music: ',
      narrationTextMissing: 'Please enter English text to be read aloud.',
      narrationTextTooLong: 'Text must not exceed 500 characters at a time.',
      narrationPreparingOnline: 'Preparing AI Voice online. Please wait...',
      narrationCreating: 'Generating AI Voice. Please wait...',
      narrationTimeout: 'AI Voice did not finish within the expected time.',
      narrationDownloadFailed: 'WAV audio download failed.',
      narrationEmpty: 'The WAV audio is empty.',
      captionTextInvalid: 'Please enter text and correct the timing.',
      canvasUnavailable: 'Could not open the canvas.',
      videoMetadataFailed: 'Could not read the video dimensions and duration.',
      videoDurationInvalid: 'The video duration is invalid.',
      videoMp4Invalid: 'Could not create a valid MP4.',
      videoAudioInvalid: 'Could not read the WAV audio.',
      videoSpeechMissing: 'No speech was detected in the audio.',
      subtitleTimeInvalid: 'The subtitle timing is invalid.',
      videoDurationMissing: 'Could not read the video duration.',
      videoFooter: 'Use videos up to 100 MB. The first setup requires internet; later, the FFmpeg files saved in your browser will be used.'
    }
  }

  const t = (key: string) =>
    uiText[language]?.[key] ?? uiText['om-ET'][key] ?? key

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="logo"><Sparkles size={25}/></div>
          <div><h1>HELLO AI</h1><small>{t("tagline")}</small></div>
        </div>
        <button className="menu"><Menu/></button>
      </header>

      <section className="welcome">
        <div className="hello-icon"><Sparkles size={32}/></div>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2>{t("welcome")}</h2>
        <h3>{t("welcomeTitle")}</h3>
        <p>{t("welcomeText")}</p>

        <div className="language">
          <Globe size={18}/>
          <select value={language} onChange={e => {
            setLanguage(e.target.value)
            stopSpeaking()
            setNotice('')
          }}>
            <option value="om-ET">Afaan Oromoo</option>
            <option value="am-ET">አማርኛ</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </section>

      <section className="chat">
        <div className="chat-title"><MessageCircle size={19}/> {t("chat")}</div>

        {messages.length === 0 ? (
          <div className="empty">
            <Sparkles size={28}/>
            <p>{t("emptyTitle")}</p>
            <small>{t("emptyText")}</small>
          </div>
        ) : (
          messages.map((item, i) => (
            <div className={item.role === 'user' ? 'user-message' : 'assistant-message'} key={i}>
              {item.content}
              {item.role === 'assistant' && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="voice"
                    onClick={() => speakText(item.content, i)}
                  >
                    {speakingIndex === i ? <Square size={17}/> : <Volume2 size={17}/>}
                    {speakingIndex === i ? t("stop") : t("listen")}
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {loading && <div className="assistant-message">HELLO AI deebii qopheessaa jira...</div>}

        <div className="composer">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t("question")}
            rows={2}
          />
          <div className="composer-actions">
            <button className="voice" onClick={startVoice} disabled={loading}>
              <Mic size={20}/> {listening ? t("stop") : t("voice")}
            </button>
            <button className="send" onClick={sendMessage} disabled={loading || !message.trim()}>
              <Send size={19}/> {loading ? t("waiting") : t("send")}
            </button>
          </div>
        </div>
        {notice && <p className="notice">{notice}</p>}
      </section>

      <section className="tools">
        <h3><Sparkles size={19}/> {t("tools")}</h3>
        <div className="tool-grid">
          <button type="button" className="tool" onClick={() => {
              const chat = document.querySelector(".chat")
              if (chat) {
                chat.scrollIntoView({ behavior: "smooth", block: "center" })
                setNotice(t("chatReady"))
              } else {
                setNotice(t("chatMissing"))
              }
            }}><MessageCircle/><b>AI Chat</b><small>{t("ask")}</small></button>
          <div className="tool"><Mic/><b>AI Voice</b><small>{t("speak")}</small></div>
          <button
            type="button"
            className="tool"
            onClick={() => setShowImageTool(v => !v)}
            style={{ appearance: 'none', background: 'transparent', border: 0, width: '100%', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
          >
            <Image/><b>AI Image</b><small>{t("makeImage")}</small>
          </button>
          <button
            type="button"
            className="tool"
            onClick={() => setShowVideoTool(v => !v)}
            style={{ appearance: 'none', background: 'transparent', border: 0, width: '100%', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
          >
            <Video/><b>AI Video</b><small>{t("makeVideo")}</small>
          </button>
          <button
            type="button"
            className="tool"
            onClick={() => setShowWritingTool(v => !v)}
            style={{ appearance: 'none', background: 'transparent', border: 0, width: '100%', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
          >
            <FileText/><b>AI Writing</b><small>{t("makeWriting")}</small>
          </button>
          <button
            type="button"
            className="tool"
            onClick={() => setShowTranslateTool(v => !v)}
            style={{ appearance: 'none', background: 'transparent', border: 0, width: '100%', color: 'inherit', font: 'inherit', cursor: 'pointer' }}
          >
            <Sparkles/><b>AI Translate</b><small>{t("translate")}</small>
          </button>
        </div>
      </section>


      {showVideoTool && (
        <section style={{
          margin: '20px 0',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--card, #ffffff)',
          border: '1px solid #dddddd'
        }}>
          <h3><Video size={20}/> {t("videoEditor")}</h3>
          <p>{t("videoIntro")}</p>

          <div style={{ margin: '16px 0', padding: '14px', border: '1px solid #999', borderRadius: '12px' }}>
            <h4>{t("textVideo")}</h4>
            <p style={{ fontSize: '13px' }}>
              {t("textVideoInfo")}
            </p>

            <textarea
              value={textVideoPrompt}
              onChange={e => setTextVideoPrompt(e.target.value)}
              placeholder={t("textVideoPlaceholder")}
              rows={4}
              maxLength={2000}
              disabled={imageLoading || videoLoading}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px' }}
            />

            <button
              type="button"
              className="send"
              onClick={createTextVideo}
              disabled={imageLoading || videoLoading || !textVideoPrompt.trim()}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {imageLoading
                ? t("videoTextBusy")
                : videoLoading
                  ? t("videoMp4Busy")
                  : t("makeTextVideo")}
            </button>
          </div>

          <div style={{ margin: '16px 0', padding: '14px', border: '1px solid #999', borderRadius: '12px' }}>
            <h4>{t("imageVideo")}</h4>
            <p style={{ fontSize: '13px' }}>
              {t("imageVideoInfo")}
            </p>

            <label htmlFor="image-to-video-file">{t("chooseImage")}</label>
            <input
              id="image-to-video-file"
              type="file"
              accept="image/*"
              disabled={videoLoading}
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!file.type.startsWith('image/')) {
                  setVideoNotice(t("imageFileOnly"))
                  return
                }
                if (file.size > 20 * 1024 * 1024) {
                  setVideoNotice(t("imageTooLarge"))
                  return
                }
                setImageFile(file)
                setImageUrl(URL.createObjectURL(file))
                setVideoOutput('')
                setVideoNotice(t("imageSelected"))
              }}
              style={{ display: 'block', width: '100%', margin: '10px 0' }}
            />

            {imageUrl && (
              <img
                src={imageUrl}
                alt={t("imageVideoAlt")}
                style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', borderRadius: '10px' }}
              />
            )}

            <label htmlFor="image-video-duration">{t("videoDuration")}</label>
            <select
              id="image-video-duration"
              value={imageDuration}
              onChange={e => setImageDuration(e.target.value)}
              disabled={videoLoading}
              style={{ display: 'block', width: '100%', padding: '12px', margin: '8px 0' }}
            >
              <option value="5">{t("seconds5")}</option>
              <option value="10">{t("seconds10")}</option>
              <option value="15">{t("seconds15")}</option>
            </select>

            <button
              type="button"
              className="send"
              onClick={() => createImageVideo()}
              disabled={videoLoading || !imageFile}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {videoLoading ? t("imageVideoBusy") : t("imageToMp4")}
            </button>
          </div>

          <label htmlFor="video-file">{t("chooseVideo")}</label>
          <input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={e => selectVideo(e.target.files?.[0])}
            disabled={videoLoading}
            style={{ display: 'block', width: '100%', margin: '12px 0' }}
          />

          {videoUrl && (
            <video
              src={videoUrl}
              controls
              playsInline
              style={{ width: '100%', borderRadius: '12px', margin: '10px 0' }}
            />
          )}

          <label htmlFor="video-file-2">{t("chooseSecondVideo")}</label>
          <input
            id="video-file-2"
            type="file"
            accept="video/*"
            onChange={e => selectVideo2(e.target.files?.[0])}
            disabled={videoLoading}
            style={{ display: 'block', width: '100%', margin: '12px 0' }}
          />

          {videoUrl2 && (
            <video
              src={videoUrl2}
              controls
              playsInline
              style={{ width: '100%', borderRadius: '12px', margin: '10px 0' }}
            />
          )}

          <label htmlFor="video-start">{t("startTime")}</label>
          <input
            id="video-start"
            type="number"
            min="0"
            step="0.1"
            value={videoStart}
            onChange={e => setVideoStart(e.target.value)}
            disabled={videoLoading}
            style={{ width: '100%', padding: '12px', margin: '8px 0 14px', boxSizing: 'border-box' }}
          />

          <label htmlFor="video-end">{t("endTime")}</label>
          <input
            id="video-end"
            type="number"
            min="0.1"
            step="0.1"
            value={videoEnd}
            onChange={e => setVideoEnd(e.target.value)}
            placeholder={t("endTimeExample")}
            disabled={videoLoading}
            style={{ width: '100%', padding: '12px', margin: '8px 0 14px', boxSizing: 'border-box' }}
          />

          <button
            type="button"
            className="send"
            onClick={trimVideo}
            disabled={videoLoading || !videoFile || !videoEnd}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {videoLoading ? t("trimBusy") : t("trimVideo")}
          </button>

          <button
            type="button"
            className="send"
            onClick={mergeVideos}
            disabled={videoLoading || !videoFile || !videoFile2}
            style={{ width: '100%', marginTop: '12px' }}
          >
            {videoLoading ? t("mergeBusy") : t("mergeVideos")}
          </button>

          <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #dddddd' }}>
            <h4>{t("subtitles")}</h4>

            <label htmlFor="video-caption-text">{t("subtitleText")}</label>
            <textarea
              id="video-caption-text"
              value={captionText}
              onChange={e => setCaptionText(e.target.value)}
              placeholder={t("subtitlePlaceholder")}
              rows={3}
              disabled={videoLoading}
              style={{ width: '100%', padding: '12px', margin: '8px 0', boxSizing: 'border-box' }}
            />

            <label htmlFor="caption-start">{t("startTime")}</label>
            <input
              id="caption-start"
              type="number"
              min="0"
              step="0.1"
              value={captionStart}
              onChange={e => setCaptionStart(e.target.value)}
              disabled={videoLoading}
              style={{ width: '100%', padding: '12px', margin: '8px 0', boxSizing: 'border-box' }}
            />

            <label htmlFor="caption-end">{t("endTime")}</label>
            <input
              id="caption-end"
              type="number"
              min="0.1"
              step="0.1"
              value={captionEnd}
              onChange={e => setCaptionEnd(e.target.value)}
              disabled={videoLoading}
              style={{ width: '100%', padding: '12px', margin: '8px 0', boxSizing: 'border-box' }}
            />

            <button
              type="button"
              className="send"
              onClick={addVideoCaption}
              disabled={videoLoading || !videoFile || !captionText.trim()}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {videoLoading ? t("subtitleBusy") : t("addSubtitle")}
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', border: '1px solid #999', borderRadius: '12px' }}>
            <h4>{t("autoSubtitles")}</h4>
            <p style={{ fontSize: '13px' }}>
              {t("autoSubtitleInfo")}
            </p>
            <button
              type="button"
              className="send"
              onClick={createAutomaticSubtitles}
              disabled={videoLoading || !videoFile}
              style={{ width: '100%', marginTop: '8px' }}
            >
              {videoLoading ? t("autoSubtitleBusy") : t("createFromAudio")}
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', border: '1px solid #999', borderRadius: '12px' }}>
            <h4>{t("manySubtitles")}</h4>
            <p style={{ fontSize: '13px' }}>
              {t("subtitleInstructions")}
            </p>
            <textarea
              value={multipleCaptions}
              onChange={e => setMultipleCaptions(e.target.value)}
              rows={8}
              disabled={videoLoading}
              placeholder={'0|5|Barnoonni furtuu milkaa\'inaati.\n6|10|Beekumsi jireenya jijjiira.'}
              style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              className="send"
              onClick={addMultipleVideoCaptions}
              disabled={videoLoading || !videoFile || !multipleCaptions.trim()}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {videoLoading ? t("multiSubtitleBusy") : t("addMany")}
            </button>
          </div>

          <div style={{ marginTop: '20px', padding: '14px', border: '1px solid #888', borderRadius: '12px' }}>
            <div style={{ marginBottom: '18px', padding: '14px', border: '1px solid #888', borderRadius: '12px' }}>
              <h3>{t("aiNarration")}</h3>
              <p>{t("narrationInfo")}</p>
              <textarea
                value={aiNarrationText}
                onChange={e => setAiNarrationText(e.target.value)}
                placeholder={t("narrationPlaceholder")}
                rows={5}
                style={{ width: '100%', padding: '12px', boxSizing: 'border-box' }}
                disabled={aiNarrationLoading}
              />
              <label htmlFor="ai-voice-choice">{t("chooseVoice")}</label>
              <select
                id="ai-voice-choice"
                value={aiNarrationVoice}
                onChange={e => setAiNarrationVoice(e.target.value)}
                disabled={aiNarrationLoading}
                style={{ display: 'block', width: '100%', padding: '10px', margin: '8px 0' }}
              >
                <option value="af_heart">Female — American</option>
                <option value="af_bella">Female — American 2</option>
                <option value="am_michael">Male — American</option>
                <option value="am_adam">Male — American 2</option>
                <option value="bf_emma">Female — British</option>
                <option value="bm_george">Male — British</option>
              </select>
              <button
                type="button"
                className="send"
                onClick={generateAiNarration}
                disabled={aiNarrationLoading || videoLoading || !aiNarrationText.trim()}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {aiNarrationLoading ? t("narrationBusy") : t("createWav")}
              </button>
              {aiNarrationFile && (
                <p>{t("narrationReady")}: {aiNarrationFile.name}</p>
              )}
              {aiNarrationUrl && (
                <audio controls src={aiNarrationUrl} style={{ width: '100%', marginTop: '8px' }} />
              )}
              <p style={{ fontSize: '13px' }}>
                {t("onlineVoiceNote")}
              </p>
            </div>
            <h3>{t("narrationMusic")}</h3>

            <p>{t("recordVoiceInfo")}</p>

            <button
              type="button"
              className="send"
              onClick={startNarrationRecording}
              disabled={videoLoading || isRecording}
              style={{ width: '100%', marginBottom: '8px' }}
            >
              {t("recordVoice")}
            </button>

            <button
              type="button"
              onClick={stopNarrationRecording}
              disabled={!isRecording}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {t("stopRecording")}
            </button>

            {narrationFile && (
              <p>{t("recordReady")}: {narrationFile.name}</p>
            )}

            <label htmlFor="background-music">{t("chooseMusic")}</label>
            <input
              id="background-music"
              type="file"
              accept="audio/*"
              onChange={e => setMusicFile(e.target.files?.[0] || null)}
              disabled={videoLoading}
              style={{ display: 'block', width: '100%', margin: '10px 0' }}
            />

            {musicFile && <p>{t("musicSelected")}: {musicFile.name}</p>}

            <button
              type="button"
              className="send"
              onClick={mixNarrationAndMusic}
              disabled={videoLoading || isRecording}
              style={{ width: '100%', marginTop: '10px' }}
            >
              {videoLoading ? t('mixBusy') : t('mixAudio')}
            </button>

            <p style={{ fontSize: '13px' }}>
              {t("mixDescription")}
            </p>
          </div>

          {videoOutput && (
            <div style={{ marginTop: '16px' }}>
              <video
                src={videoOutput}
                controls
                playsInline
                style={{ width: '100%', borderRadius: '12px' }}
              />
              <a
                href={videoOutput}
                download="hello-ai-video.mp4"
                style={{ display: 'inline-block', marginTop: '12px' }}
              >
                {t("downloadMp4")}
              </a>
            </div>
          )}

          {videoNotice && (
            <p className="notice" style={{ overflowWrap: 'anywhere' }}>{videoNotice}</p>
          )}

          <p style={{ fontSize: '13px' }}>
            {t("videoFooter")}
          </p>
        </section>
      )}

      {showImageTool && (
        <section style={{
          margin: '20px 0',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--card, #ffffff)',
          border: '1px solid #dddddd'
        }}>
          <h3><Image size={20}/> {t("imageTitle")}</h3>
          <p>{t("imageInfo")}</p>

          <textarea
            value={imagePrompt}
            onChange={e => setImagePrompt(e.target.value)}
            placeholder={t("imagePlaceholder")}
            rows={4}
            maxLength={3000}
            disabled={imageLoading}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px' }}
          />

          <button
            type="button"
            className="send"
            onClick={() => generateImage()}
            disabled={imageLoading || !imagePrompt.trim()}
            style={{ marginTop: '12px', width: '100%' }}
          >
            <Image size={18}/>
            {imageLoading ? t("generateImageBusy") : t("generateImage")}
          </button>

          {generatedImage && (
            <div style={{ marginTop: '18px' }}>
              <img
                src={generatedImage}
                alt={t("imageAlt")}
                style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '12px' }}
              />
              <a
                href={generatedImage}
                download={`hello-ai-image.${imageMimeType.includes('jpeg') ? 'jpg' : 'png'}`}
                style={{ display: 'inline-block', marginTop: '12px' }}
              >
                {t("downloadImage")}
              </a>
            </div>
          )}
        </section>
      )}


      {showWritingTool && (
        <section style={{
          margin: '20px 0',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--card, #ffffff)',
          border: '1px solid #dddddd'
        }}>
          <h3><FileText size={20}/> {t("writingTitle")}</h3>
          <p>{t("writingInfo")}</p>

          <label htmlFor="writing-task">{t("writingTask")}</label>
          <select
            id="writing-task"
            value={writingTask}
            onChange={e => setWritingTask(e.target.value)}
            disabled={writingLoading}
            style={{ width: '100%', padding: '12px', margin: '8px 0 14px', borderRadius: '10px' }}
          >
            <option value="create">{t("writingCreate")}</option>
            <option value="improve">{t("writingImprove")}</option>
            <option value="correct">{t("writingCorrect")}</option>
            <option value="summarize">{t("writingSummarize")}</option>
            <option value="outline">{t("writingOutline")}</option>
            <option value="email">{t("writingEmail")}</option>
            <option value="social">{t("writingSocial")}</option>
          </select>

          <textarea
            value={writingText}
            onChange={e => setWritingText(e.target.value)}
            placeholder={t("writingPlaceholder")}
            rows={5}
            maxLength={8000}
            disabled={writingLoading}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px' }}
          />

          <button
            type="button"
            className="send"
            onClick={generateWriting}
            disabled={writingLoading || !writingText.trim()}
            style={{ marginTop: '12px', width: '100%' }}
          >
            <FileText size={18}/>
            {writingLoading ? t("writingBusy") : t("writingSubmit")}
          </button>

          {writingResult && (
            <div style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--background, #f5f5f5)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere'
            }}>
              <h4>{t("writingResult")}</h4>
              <p>{writingResult}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(writingResult)
                    setNotice(t("writingCopied"))
                  } catch {
                    setNotice(t("copyFailed"))
                  }
                }}
              >
                {t("writingCopy")}
              </button>
            </div>
          )}
        </section>
      )}

      {showTranslateTool && (
        <section style={{
          margin: '20px 0',
          padding: '18px',
          borderRadius: '16px',
          background: 'var(--card, #ffffff)',
          border: '1px solid #dddddd'
        }}>
          <h3><Sparkles size={20}/> {t("translateTitle")}</h3>
          <p>{t("translateInfo")}</p>

          <label htmlFor="source-language">{t("sourceLanguage")}</label>
          <select
            id="source-language"
            value={sourceLanguage}
            onChange={e => setSourceLanguage(e.target.value)}
            disabled={translateLoading}
            style={{ width: '100%', padding: '12px', margin: '8px 0 14px', borderRadius: '10px' }}
          >
            <option value="auto">{t("autoDetect")}</option>
            <option value="om-ET">Afaan Oromoo</option>
            <option value="am-ET">አማርኛ</option>
            <option value="en-US">English</option>
          </select>

          <label htmlFor="target-language">{t("targetLanguage")}</label>
          <select
            id="target-language"
            value={targetLanguage}
            onChange={e => setTargetLanguage(e.target.value)}
            disabled={translateLoading}
            style={{ width: '100%', padding: '12px', margin: '8px 0 14px', borderRadius: '10px' }}
          >
            <option value="om-ET">Afaan Oromoo</option>
            <option value="am-ET">አማርኛ</option>
            <option value="en-US">English</option>
          </select>

          <textarea
            value={translateText}
            onChange={e => setTranslateText(e.target.value)}
            placeholder={t("translatePlaceholder")}
            rows={5}
            maxLength={8000}
            disabled={translateLoading}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px' }}
          />

          <button
            type="button"
            className="send"
            onClick={translateTextNow}
            disabled={translateLoading || !translateText.trim()}
            style={{ marginTop: '12px', width: '100%' }}
          >
            <Globe size={18}/>
            {translateLoading ? t("translateBusy") : t("translateSubmit")}
          </button>

          {translation && (
            <div style={{
              marginTop: '18px',
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--background, #f5f5f5)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere'
            }}>
              <h4>{t("translationResult")}</h4>
              <p>{translation}</p>
              <button
                type="button"
                onClick={async () => {
                  const textToCopy = translation

                  try {
                    if (navigator.clipboard && window.isSecureContext) {
                      await navigator.clipboard.writeText(textToCopy)
                      setNotice(t("translationCopied"))
                      return
                    }
                  } catch (error) {
                    console.warn('Clipboard API failed:', error)
                  }

                  try {
                    const textArea = document.createElement('textarea')
                    textArea.value = textToCopy
                    textArea.style.position = 'fixed'
                    textArea.style.opacity = '0'
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()
                    const copied = document.execCommand('copy')
                    document.body.removeChild(textArea)

                    setNotice(
                      copied
                        ? t("translationCopied")
                        : t("copyFailed")
                    )
                  } catch (error) {
                    setNotice(t("copyFailed"))
                  }
                }}
              >
                {t("translationCopy")}
              </button>
            </div>
          )}
        </section>
      )}

      <footer>© 2026 HELLO AI · Your AI, Your World</footer>
    </main>
  )
}

export default App

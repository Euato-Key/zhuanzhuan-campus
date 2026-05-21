import { ref, computed } from 'vue'
import { recognizeProduct, type RecognitionResult, type RecognitionPhases, type PhaseDetails } from '@/api/modules/ai'
import { ElMessage } from 'element-plus'
import { uploadImage } from '@/api/modules/upload'

export type RecognitionStatusType = 'idle' | 'uploading' | 'recognizing' | 'success' | 'error'

interface StreamEvent {
  type: 'connected' | 'phase_start' | 'thinking' | 'phase_complete' | 'phase_results' | 'done' | 'error'
  phase?: string
  message?: string
  content?: string
  durationMs?: number
  result?: RecognitionResult
  keywords?: string[]
  urls?: string[]
  count?: number
  pagesOk?: number
  results?: any[]
}

export function useAiRecognition() {
  const status = ref<RecognitionStatusType>('idle')
  const currentPhase = ref<string>('')
  const phases = ref<RecognitionPhases | null>(null)
  const phaseDetails = ref<PhaseDetails | null>(null)
  const result = ref<RecognitionResult | null>(null)
  const error = ref<string | null>(null)
  const uploadedImages = ref<string[]>([])
  const uploadedOssPaths = ref<string[]>([])
  const progressText = ref('')

  const streamThinkingContent = ref('')
  const streamPhaseStatus = ref<Record<string, 'pending' | 'active' | 'completed' | 'error' | 'skipped'>>({})
  const streamSearchKeywords = ref<string[]>([])
  const streamFetchUrls = ref<string[]>([])
  const streamSearchCount = ref(0)
  const streamPagesOk = ref(0)
  const streamPhase2Results = ref<any[]>([])
  const streamPhase3Results = ref<any[]>([])

  const estimatedPhases = ['phase1', 'phase2', 'phase3', 'phase4']

  const completedPhases = computed(() => {
    if (!phases.value) return []
    const completed: string[] = []
    if (phases.value.phase1Completed) completed.push('phase1')
    if (phases.value.phase2Completed) completed.push('phase2')
    if (phases.value.phase3Completed) completed.push('phase3')
    if (phases.value.phase4Completed) completed.push('phase4')
    return completed
  })

  function getPhaseStatus(phase: string): 'pending' | 'active' | 'completed' | 'error' | 'skipped' {
    if (status.value === 'recognizing' && streamPhaseStatus.value[phase]) {
      return streamPhaseStatus.value[phase]
    }
    if (!phases.value) {
      if (phase === 'phase1' && status.value === 'recognizing') return 'active'
      return 'pending'
    }
    const idx = estimatedPhases.indexOf(phase)
    const completed = completedPhases.value
    const mcpUsed = phases.value.mcpUsed
    if (phase === 'phase1') {
      if (phases.value.phase1Completed) return 'completed'
      return 'active'
    }
    if (!mcpUsed) return 'skipped'
    if (phase === 'phase2' || phase === 'phase3' || phase === 'phase4') {
      if (completed.includes(phase)) return 'completed'
      if (status.value === 'error') return 'error'
      const prevIdx = idx - 1
      if (prevIdx >= 0 && !completed.includes(estimatedPhases[prevIdx])) return 'pending'
      if (status.value === 'recognizing') return 'active'
      return 'pending'
    }
    return 'pending'
  }

  async function uploadImages(files: File[]): Promise<string[]> {
    status.value = 'uploading'
    error.value = null
    const paths: string[] = []
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isImage) { ElMessage.error(`${file.name} 不是图片文件`); continue }
      if (!isLt5M) { ElMessage.error(`${file.name} 超过5MB限制`); continue }
      try {
        const res = await uploadImage(file, 'product')
        if (res.data.code === 200) {
          paths.push(res.data.data.url)
          uploadedOssPaths.value.push(res.data.data.ossPath)
        }
      } catch { ElMessage.error(`${file.name} 上传失败`) }
    }
    uploadedImages.value = [...uploadedImages.value, ...paths]
    status.value = 'idle'
    return paths
  }

  async function recognize(images: string[], name?: string, brand?: string): Promise<RecognitionResult | null> {
    status.value = 'recognizing'
    currentPhase.value = 'phase1'
    error.value = null
    try {
      const res = await recognizeProduct(images, name, brand)
      if (res.data.code !== 200) {
        error.value = res.data.message || '识别失败'
        status.value = 'error'
        ElMessage.error(error.value!)
        return null
      }
      const r = res.data.data
      if (r.phases) phases.value = r.phases
      if (r.phaseDetails) phaseDetails.value = r.phaseDetails
      result.value = r
      if (phases.value?.phase1Completed) currentPhase.value = 'phase1'
      if (phases.value?.phase2Completed) currentPhase.value = 'phase2'
      if (phases.value?.phase3Completed) currentPhase.value = 'phase3'
      if (phases.value?.phase4Completed) currentPhase.value = 'phase4'
      status.value = 'success'
      return r
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      error.value = err.response?.data?.message || 'AI 识别服务暂时不可用'
      status.value = 'error'
      ElMessage.error(error.value!)
      return null
    }
  }

  async function recognizeStream(images: string[], name?: string, brand?: string): Promise<RecognitionResult | null> {
    status.value = 'recognizing'
    currentPhase.value = 'phase1'
    error.value = null
    streamThinkingContent.value = ''
    streamPhaseStatus.value = { phase1: 'active' }
    streamSearchKeywords.value = []
    streamFetchUrls.value = []
    streamSearchCount.value = 0
    streamPagesOk.value = 0
    streamPhase2Results.value = []
    streamPhase3Results.value = []

    try {
      const token = localStorage.getItem('access_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL
      const response = await fetch(`${baseUrl}/ai/recognize-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ images, name, brand }),
      })
      if (!response.ok) throw new Error('Stream request failed')

      const reader = response.body!.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.substring(6)
          if (data === '[DONE]') continue
          try { handleStreamEvent(JSON.parse(data)) } catch { /* skip */ }
        }
      }
      decoder.decode()
      return result.value
    } catch (e: unknown) {
      const err = e as { message?: string }
      error.value = err.message || 'AI 识别服务暂时不可用'
      if (status.value !== 'error') status.value = 'error'
      if (!error.value.includes('aborted')) ElMessage.error(error.value!)
      return null
    }
  }

  function handleStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case 'thinking':
        if (event.content) streamThinkingContent.value += event.content
        break
      case 'phase_start':
        if (event.phase) {
          streamPhaseStatus.value = { ...streamPhaseStatus.value, [event.phase]: 'active' }
          currentPhase.value = event.phase
          if (event.phase === 'phase2' && event.keywords) streamSearchKeywords.value = event.keywords
          if (event.phase === 'phase3' && event.urls) streamFetchUrls.value = event.urls
        }
        break
      case 'phase_complete':
        if (event.phase) {
          streamPhaseStatus.value = { ...streamPhaseStatus.value, [event.phase]: 'completed' }
          if (event.phase === 'phase2' && event.count !== undefined) streamSearchCount.value = event.count
          if (event.phase === 'phase3' && event.pagesOk !== undefined) streamPagesOk.value = event.pagesOk
        }
        break
      case 'done':
        if (event.result) {
          const r = event.result
          if (r.phases) phases.value = r.phases
          if (r.phaseDetails) phaseDetails.value = r.phaseDetails
          result.value = r
          status.value = 'success'
        }
        break
      case 'error':
        if (event.message) {
          error.value = event.message
          if (event.phase) streamPhaseStatus.value = { ...streamPhaseStatus.value, [event.phase]: 'error' }
          if (event.phase === 'phase1' || !event.phase) {
            status.value = 'error'
            ElMessage.error(event.message)
          }
        }
        break
      case 'phase_results':
        if (event.phase === 'phase2' && event.results) {
          streamPhase2Results.value = event.results
        } else if (event.phase === 'phase3' && event.results) {
          streamPhase3Results.value = event.results
        }
        break
    }
  }

  function reset() {
    status.value = 'idle'
    currentPhase.value = ''
    phases.value = null
    phaseDetails.value = null
    result.value = null
    error.value = null
    uploadedImages.value = []
    uploadedOssPaths.value = []
    progressText.value = ''
    streamThinkingContent.value = ''
    streamPhaseStatus.value = {}
    streamSearchKeywords.value = []
    streamFetchUrls.value = []
    streamSearchCount.value = 0
    streamPagesOk.value = 0
    streamPhase2Results.value = []
    streamPhase3Results.value = []
  }

  function removeImage(index: number) {
    uploadedImages.value.splice(index, 1)
    uploadedOssPaths.value.splice(index, 1)
  }

  const hasResult = computed(() => status.value === 'success' && result.value !== null)
  const mcpEnabled = computed(() => phases.value?.mcpUsed ?? false)

  return {
    status, currentPhase, phases, phaseDetails, result, error,
    uploadedImages, uploadedOssPaths, progressText,
    streamThinkingContent, streamPhaseStatus,
    streamSearchKeywords, streamFetchUrls, streamSearchCount, streamPagesOk,
    streamPhase2Results, streamPhase3Results,
    completedPhases, hasResult, mcpEnabled, getPhaseStatus,
    uploadImages, recognize, recognizeStream, reset, removeImage,
  }
}

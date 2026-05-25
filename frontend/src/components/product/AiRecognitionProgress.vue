<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'
import type { RecognitionPhases, PhaseDetails, Phase1Detail, Phase2Detail, Phase3Detail, Phase4Detail, FetchedPageDetail, WebSearchResult } from '@/api/modules/ai'

const props = defineProps<{
  phases: RecognitionPhases | null
  phaseDetails: PhaseDetails | null
  getPhaseStatus: (phase: string) => 'pending' | 'active' | 'completed' | 'error' | 'skipped'
  streamThinkingContent?: string
  streamSearchKeywords?: string[]
  streamFetchUrls?: string[]
  streamSearchCount?: number
  streamPagesOk?: number
  streamPhase2Results?: WebSearchResult[]
  streamPhase3Results?: FetchedPageDetail[]
}>()

const steps = [
  { key: 'phase1', title: '图片识别', icon: 'Picture', description: 'AI分析图片特征' },
  { key: 'phase2', title: '联网搜索', icon: 'Search', description: '搜索商品信息' },
  { key: 'phase3', title: '页面抓取', icon: 'Reading', description: '提取网页数据' },
  { key: 'phase4', title: '信息融合', icon: 'Connection', description: '整合生成结果' },
]

const activeStep = computed(() => {
  if (!props.phases) return 0
  const allPhases = ['phase1', 'phase2', 'phase3', 'phase4']
  for (let i = allPhases.length - 1; i >= 0; i--) {
    if (props.phases[`${allPhases[i]}Completed` as keyof RecognitionPhases]) return i
  }
  return 0
})

function getElStepStatus(phaseKey: string) {
  const status = props.getPhaseStatus(phaseKey)
  if (status === 'completed') return 'success'
  if (status === 'active') return 'process'
  if (status === 'error') return 'error'
  return 'wait'
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  return `${(bytes / 1024).toFixed(1)}KB`
}

const phase1Detail = computed<Phase1Detail | undefined>(() => props.phaseDetails?.phase1)
const phase2Detail = computed<Phase2Detail | undefined>(() => props.phaseDetails?.phase2)
const phase3Detail = computed<Phase3Detail | undefined>(() => props.phaseDetails?.phase3)
const phase4Detail = computed<Phase4Detail | undefined>(() => props.phaseDetails?.phase4)

// Auto-scroll for thinking stream
const thinkingContainer = ref<HTMLElement | null>(null)
const userScrolledUp = ref(false)
const thinkingCollapsed = ref(false)

function toggleThinking() { thinkingCollapsed.value = !thinkingCollapsed.value }

function onThinkingScroll() {
  const el = thinkingContainer.value
  if (!el) return
  userScrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight >= 40
}

watch(() => props.streamThinkingContent, () => {
  if (userScrolledUp.value || thinkingCollapsed.value) return
  nextTick(() => {
    if (thinkingContainer.value) thinkingContainer.value.scrollTop = thinkingContainer.value.scrollHeight
  })
})

watch(() => props.streamThinkingContent, (val) => {
  if (!val) { userScrolledUp.value = false; thinkingCollapsed.value = false }
})
</script>

<template>
  <div class="ai-recognition-progress">
    <el-steps :active="activeStep" align-center class="ai-steps">
      <el-step v-for="step in steps" :key="step.key" :title="step.title" :description="step.description"
        :status="getElStepStatus(step.key)"
        :class="{ 'ai-step-active': getPhaseStatus(step.key) === 'active', 'ai-step-completed': getPhaseStatus(step.key) === 'completed', 'ai-step-error': getPhaseStatus(step.key) === 'error', 'ai-step-skipped': getPhaseStatus(step.key) === 'skipped' }"
      />
    </el-steps>

    <!-- Live thinking / thinking completed (with collapse toggle) -->
    <div v-if="streamThinkingContent" class="ai-stream-thinking">
      <div class="stream-header">
        <template v-if="getPhaseStatus('phase1') === 'active'">
          <span class="stream-pulse"></span><span>AI 思考中...</span>
        </template>
        <template v-else>
          <span>AI 思考过程</span>
        </template>
        <span class="stream-toggle" @click="toggleThinking">{{ thinkingCollapsed ? '展开' : '收起' }}</span>
      </div>
      <div v-show="!thinkingCollapsed" class="stream-content" ref="thinkingContainer" @scroll="onThinkingScroll">{{ streamThinkingContent }}</div>
    </div>

    <!-- Phase 1 completed detail -->
    <div v-if="phase1Detail && getPhaseStatus('phase1') === 'completed'" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">识别结果</span>
        <span class="phase-card-duration">{{ formatDuration(phase1Detail.durationMs) }}</span>
      </div>
      <div class="phase-card-body">
        <div v-if="phase1Detail.identification.brand || phase1Detail.identification.model">
          <strong>品牌型号：</strong>{{ [phase1Detail.identification.brand, phase1Detail.identification.model].filter(Boolean).join(' ') }}
        </div>
        <div v-if="phase1Detail.identification.category"><strong>分类：</strong>{{ phase1Detail.identification.category }}</div>
        <div v-if="phase1Detail.identification.keyFeatures.length" class="ai-features-list">
          <span class="feature-tag" v-for="(f, i) in phase1Detail.identification.keyFeatures" :key="i">{{ f }}</span>
        </div>
        <div v-if="phase1Detail.searchKeywords.length" style="margin-top:8px">
          <strong>搜索关键词：</strong>
          <el-tag size="small" type="info" v-for="(k,i) in phase1Detail.searchKeywords" :key="i" style="margin:2px">{{ k }}</el-tag>
        </div>
      </div>
    </div>

    <!-- Phase 2 active: searching -->
    <div v-if="getPhaseStatus('phase2') === 'active'" class="ai-phase-card ai-phase-active">
      <div class="phase-card-header">
        <span class="phase-card-title">正在搜索商品信息...</span>
        <span class="phase-card-spinner"></span>
      </div>
      <div class="phase-card-body">
        <div v-if="streamSearchKeywords && streamSearchKeywords.length">
          <strong>搜索关键词：</strong>
          <el-tag size="small" type="warning" v-for="(k,i) in streamSearchKeywords" :key="i" style="margin:2px">{{ k }}</el-tag>
        </div>
        <div v-else style="color:#9E9E9E;font-size:12px;margin-top:8px">搜索中...</div>
      </div>
    </div>

    <!-- Phase 2: completed but detail not yet arrived (bridge) -->
    <div v-if="getPhaseStatus('phase2') === 'completed' && !phase2Detail" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">搜索完成，共 {{ streamPhase2Results?.length || streamSearchCount }} 条结果</span>
      </div>
      <div class="phase-card-body">
        <div class="ai-search-results" v-if="streamPhase2Results?.length">
          <div class="search-result-item" v-for="(r,i) in streamPhase2Results" :key="'sr'+i">
            <div class="search-result-title"><a :href="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }}&nbsp;↗</a></div>
            <div class="search-result-url">{{ r.url }}</div>
            <div class="search-result-snippet">{{ r.snippet }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 2 completed -->
    <div v-if="phase2Detail && getPhaseStatus('phase2') === 'completed'" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">搜索到 {{ phase2Detail.searchResults.length }} 条结果</span>
        <span class="phase-card-duration">{{ formatDuration(phase2Detail.durationMs) }}</span>
      </div>
      <div class="phase-card-body">
        <div class="ai-search-results" v-if="phase2Detail.searchResults.length">
          <div class="search-result-item" v-for="(r,i) in phase2Detail.searchResults" :key="i">
            <div class="search-result-title"><a :href="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }}&nbsp;↗</a></div>
            <div class="search-result-url">{{ r.url }}</div>
            <div class="search-result-snippet">{{ r.snippet }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 3 active: fetching -->
    <div v-if="getPhaseStatus('phase3') === 'active'" class="ai-phase-card ai-phase-active">
      <div class="phase-card-header">
        <span class="phase-card-title">正在抓取网页数据...</span>
        <span class="phase-card-spinner"></span>
      </div>
      <div class="phase-card-body">
        <div v-if="streamFetchUrls && streamFetchUrls.length">
          <strong>正在抓取 {{ streamFetchUrls.length }} 个页面：</strong>
          <div class="ai-fetch-urls">
            <div class="fetch-url-item" v-for="(u,i) in streamFetchUrls" :key="i">
              <span class="fetch-url-index">{{ i+1 }}.</span>
              <span class="fetch-url-text">
                <a :href="u" target="_blank" rel="noopener noreferrer" style="color:#2196F3;text-decoration:none">{{
                  u }}</a>
              </span>
            </div>
          </div>
        </div>
        <div v-else style="color:#9E9E9E;font-size:12px;margin-top:8px">抓取中...</div>
      </div>
    </div>

    <!-- Phase 3: completed but detail not yet arrived (bridge) -->
    <div v-if="getPhaseStatus('phase3') === 'completed' && !phase3Detail" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">抓取完成，{{ streamPagesOk || 0 }}/{{ streamFetchUrls?.length || 0 }} 个页面成功</span>
      </div>
      <div class="phase-card-body">
        <div class="ai-fetched-pages" v-if="streamPhase3Results?.length">
          <div class="fetched-page-item" v-for="(p,i) in streamPhase3Results" :key="'fp'+i">
            <div>
              <div class="fetched-page-url">
                <a :href="p.url" target="_blank" rel="noopener noreferrer">{{ p.title || p.url }}&nbsp;↗</a>
              </div>
              <div v-if="p.fetchError" class="fetched-page-error">抓取失败: {{ p.fetchError }}</div>
            </div>
            <span class="fetched-page-size" v-if="!p.fetchError">{{ formatFileSize(p.contentLength) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 3 completed -->
    <div v-if="phase3Detail && getPhaseStatus('phase3') === 'completed'" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">已抓取 {{ phase3Detail.fetchedPages.filter(p => !p.fetchError).length }} 个页面</span>
        <span class="phase-card-duration">{{ formatDuration(phase3Detail.durationMs) }}</span>
      </div>
      <div class="phase-card-body">
        <div class="ai-fetched-pages" v-if="phase3Detail.fetchedPages.length">
          <div class="fetched-page-item" v-for="(p,i) in phase3Detail.fetchedPages" :key="i">
            <div>
              <div class="fetched-page-url">
                <a :href="p.url" target="_blank" rel="noopener noreferrer">{{ p.title || p.url }}&nbsp;↗</a>
              </div>
              <div v-if="p.fetchError" class="fetched-page-error">抓取失败: {{ p.fetchError }}</div>
            </div>
            <span class="fetched-page-size" v-if="!p.fetchError">{{ formatFileSize(p.contentLength) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 4 completed -->
    <div v-if="phase4Detail && getPhaseStatus('phase4') === 'completed'" class="ai-phase-card">
      <div class="phase-card-header">
        <span class="phase-card-title">信息融合完成</span>
        <span class="phase-card-duration">{{ formatDuration(phase4Detail.durationMs) }}</span>
      </div>
      <div class="phase-card-body">
        <el-collapse v-if="phase4Detail.thinkingContent">
          <el-collapse-item title="融合推理过程"><div class="ai-thinking-content">{{ phase4Detail.thinkingContent }}</div></el-collapse-item>
        </el-collapse>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.ai-steps :deep(.el-step__title) { font-size: $font-size-body; font-weight: 500; }
.ai-steps :deep(.el-step__description) { font-size: $font-size-small; color: $color-text-secondary; }
.ai-step-active :deep(.el-step__title) { color: $color-primary !important; animation: ai-pulse 1.5s ease-in-out infinite; }
.ai-step-active :deep(.el-step__head.is-process) { color: $color-primary; border-color: $color-primary; }
.ai-step-completed :deep(.el-step__title) { color: $color-success !important; }
.ai-step-completed :deep(.el-step__head.is-success) { color: $color-success; border-color: $color-success; }
.ai-step-error :deep(.el-step__title) { color: $color-warning !important; }
.ai-step-error :deep(.el-step__head.is-error) { color: $color-warning; border-color: $color-warning; }
.ai-step-skipped :deep(.el-step__title) { color: $color-text-placeholder !important; }
.ai-step-skipped :deep(.el-step__head) { color: $color-text-placeholder; border-color: $color-text-placeholder; }

.ai-stream-thinking {
  margin-top: $spacing-md;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: #f5f7fa;
  max-height: 300px;
  overflow-y: auto;
  .stream-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid $color-border; font-size: $font-size-small; color: $color-primary; font-weight: 500; }
  .stream-pulse { width: 8px; height: 8px; border-radius: 50%; background: $color-primary; animation: ai-pulse 1.5s ease-in-out infinite; }
  .stream-toggle { margin-left: auto; cursor: pointer; font-size: 12px; color: $color-text-secondary; font-weight: 400; &:hover { color: $color-primary; } }
  .stream-content { padding: 10px 12px; font-size: $font-size-small; color: $color-text-primary; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }
}

.ai-phase-active {
  .phase-card-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid $color-border; border-top-color: $color-primary; border-radius: 50%; animation: ai-spin 0.8s linear infinite; }
  .ai-fetch-urls {
    margin-top: 8px;
    .fetch-url-item { display: flex; gap: 6px; padding: 3px 0; font-size: $font-size-small; color: $color-text-secondary; overflow: hidden;
      .fetch-url-index { flex-shrink: 0; color: $color-primary; }
      .fetch-url-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
  }
}

@keyframes ai-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
@keyframes ai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>

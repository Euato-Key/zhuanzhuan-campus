<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { showError } from '@/utils/error'
import {
  getAdminReportList,
  handleReport as handleReportApi,
  type ReportItem,
  type ReportStatus,
  type ReportTargetType,
  type HandleStatus,
  REPORT_TARGET_TYPE_LABELS,
  REPORT_TARGET_TAG_TYPE,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TAG_TYPE,
} from '@/api/modules/report'
import { formatRelativeTime, formatDate } from '@/utils/format'
import { getOssUrl } from '@/utils/oss'

const loading = ref(false)
const reports = ref<ReportItem[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const typeFilter = ref<ReportTargetType | ''>('')
const statusFilter = ref<ReportStatus | ''>('')
const keyword = ref('')
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Handle dialog
const handleDialogVisible = ref(false)
const currentReport = ref<ReportItem | null>(null)
const handleStatus = ref<HandleStatus>('resolved')
const handlerNote = ref('')
const handleLoading = ref(false)

// Detail dialog
const detailDialogVisible = ref(false)
const detailReport = ref<ReportItem | null>(null)

async function fetchReports() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (typeFilter.value) params.targetType = typeFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    if (keyword.value) params.keyword = keyword.value
    const res = await getAdminReportList(params)
    if (res.data.code === 200) {
      reports.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (err: unknown) {
    showError(err, '获取举报列表失败')
  } finally {
    loading.value = false
  }
}

function onSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => {
    currentPage.value = 1
    fetchReports()
  }, 300)
}

function onPageChange(page: number) {
  currentPage.value = page
  fetchReports()
}

function openHandleDialog(report: ReportItem) {
  currentReport.value = report
  handleStatus.value = 'resolved'
  handlerNote.value = ''
  handleDialogVisible.value = true
}

function openDetail(report: ReportItem) {
  detailReport.value = report
  detailDialogVisible.value = true
}

async function submitHandle() {
  if (!currentReport.value) return
  handleLoading.value = true
  try {
    const res = await handleReportApi(currentReport.value.id, {
      status: handleStatus.value,
      handlerNote: handlerNote.value || undefined,
    })
    if (res.data.code === 200) {
      ElMessage.success('处理成功')
      handleDialogVisible.value = false
      await fetchReports()
    } else {
      ElMessage.error(res.data.message || '处理失败')
    }
  } catch (err: unknown) {
    showError(err, '处理失败')
  } finally {
    handleLoading.value = false
  }
}

onMounted(() => {
  fetchReports()
})

onBeforeUnmount(() => {
  if (searchTimer.value) clearTimeout(searchTimer.value)
})
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-header">
      <div class="header-actions">
        <el-input
          v-model="keyword"
          placeholder="搜索举报内容"
          :prefix-icon="Search"
          clearable
          style="width: 300px"
          @keyup.enter="onSearch"
          @input="onSearch"
        />
        <el-select v-model="typeFilter" placeholder="举报类型" clearable style="width: 120px" @change="currentPage = 1; fetchReports()">
          <el-option
            v-for="(label, key) in REPORT_TARGET_TYPE_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-select v-model="statusFilter" placeholder="处理状态" clearable style="width: 120px" @change="currentPage = 1; fetchReports()">
          <el-option
            v-for="(label, key) in REPORT_STATUS_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-button type="primary" @click="onSearch">搜索</el-button>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <el-table :data="reports" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="举报类型" width="100">
          <template #default="{ row }: { row: ReportItem }">
            <el-tag :type="REPORT_TARGET_TAG_TYPE[row.targetType]" size="small">
              {{ REPORT_TARGET_TYPE_LABELS[row.targetType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="目标ID" width="90">
          <template #default="{ row }: { row: ReportItem }">
            {{ row.targetId }}
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="100">
          <template #default="{ row }: { row: ReportItem }">
            {{ row.reporter?.username || `用户${row.reporterId}` }}
          </template>
        </el-table-column>
        <el-table-column label="举报原因" min-width="120">
          <template #default="{ row }: { row: ReportItem }">
            {{ REPORT_REASON_LABELS[row.reason] }}
          </template>
        </el-table-column>
        <el-table-column label="补充说明" min-width="150" show-overflow-tooltip>
          <template #default="{ row }: { row: ReportItem }">
            {{ row.detail || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }: { row: ReportItem }">
            <el-tag :type="REPORT_STATUS_TAG_TYPE[row.status]" size="small">
              {{ REPORT_STATUS_LABELS[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="举报时间" width="160">
          <template #default="{ row }: { row: ReportItem }">
            {{ formatRelativeTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }: { row: ReportItem }">
            <el-button size="small" text type="primary" @click="openDetail(row)">
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              text
              type="warning"
              @click="openHandleDialog(row)"
            >
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && reports.length === 0" description="暂无举报数据" />

      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="currentPage"
          background
          layout="total, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          @current-change="onPageChange"
        />
      </div>
    </div>

    <!-- Handle dialog -->
    <el-dialog v-model="handleDialogVisible" title="处理举报" width="480px" :close-on-click-modal="false">
      <template v-if="currentReport">
        <div class="handle-form">
          <div class="form-item">
            <label class="form-label">处理结果</label>
            <el-select v-model="handleStatus" style="width: 100%">
              <el-option label="驳回" value="dismissed" />
              <el-option label="警告" value="warning" />
              <el-option label="封禁" value="banned" />
              <el-option label="已处理" value="resolved" />
            </el-select>
          </div>
          <div class="form-item">
            <label class="form-label">处理备注（选填）</label>
            <el-input
              v-model="handlerNote"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="请输入处理备注..."
            />
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="handleLoading" @click="submitHandle">
          确认处理
        </el-button>
      </template>
    </el-dialog>

    <!-- Detail dialog -->
    <el-dialog v-model="detailDialogVisible" title="举报详情" width="560px">
      <template v-if="detailReport">
        <div class="detail-info">
          <div class="detail-item">
            <span class="detail-label">举报ID:</span>
            <span>{{ detailReport.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">举报类型:</span>
            <el-tag :type="REPORT_TARGET_TAG_TYPE[detailReport.targetType]" size="small">
              {{ REPORT_TARGET_TYPE_LABELS[detailReport.targetType] }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="detail-label">目标ID:</span>
            <span>{{ detailReport.targetId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">举报人:</span>
            <span>{{ detailReport.reporter?.username || `用户${detailReport.reporterId}` }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">举报原因:</span>
            <span>{{ REPORT_REASON_LABELS[detailReport.reason] }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">补充说明:</span>
            <span>{{ detailReport.detail || '-' }}</span>
          </div>
          <div class="info-row" v-if="detailReport.images && detailReport.images.length > 0">
            <span class="info-label">证据图片：</span>
            <div class="info-images">
              <el-image 
                v-for="(img, idx) in detailReport.images" 
                :key="idx"
                :src="getOssUrl(img)"
                :preview-src-list="detailReport.images.map(i => getOssUrl(i))"
                fit="cover"
                style="width: 80px; height: 80px; margin-right: 8px; border-radius: 4px;"
              />
            </div>
          </div>
          <div class="detail-item">
            <span class="detail-label">状态:</span>
            <el-tag :type="REPORT_STATUS_TAG_TYPE[detailReport.status]" size="small">
              {{ REPORT_STATUS_LABELS[detailReport.status] }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="detail-label">举报时间:</span>
            <span>{{ formatRelativeTime(detailReport.createdAt) }} ({{ formatDate(detailReport.createdAt) }})</span>
          </div>
          <div v-if="detailReport.handler" class="detail-item">
            <span class="detail-label">处理人:</span>
            <span>{{ detailReport.handler.username }}</span>
          </div>
          <div v-if="detailReport.handlerNote" class="detail-item">
            <span class="detail-label">处理备注:</span>
            <span>{{ detailReport.handlerNote }}</span>
          </div>
          <div v-if="detailReport.handledAt" class="detail-item">
            <span class="detail-label">处理时间:</span>
            <span>{{ formatRelativeTime(detailReport.handledAt) }} ({{ formatDate(detailReport.handledAt) }})</span>
          </div>
        </div>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.page-header {
  margin-bottom: 24px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.handle-form,
.detail-info {
  .form-item,
  .detail-item {
    margin-bottom: $spacing-md;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-label,
  .detail-label {
    display: block;
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: $color-text-primary;
    margin-bottom: $spacing-xs;
  }
}

.detail-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .detail-label {
    margin-bottom: 0;
    min-width: 80px;
    flex-shrink: 0;
    color: $color-text-secondary;
  }
}
</style>

import request from '../index'

export interface ChartUserTrend {
  dates: string[]
  values: number[]
}

export interface ChartOrderTrend {
  dates: string[]
  counts: number[]
  revenues: number[]
}

export interface ChartPieItem {
  name: string
  value: number
}

export interface ChartStatsData {
  userTrend: ChartUserTrend
  orderTrend: ChartOrderTrend
  productStatus: ChartPieItem[]
  categoryDistribution: ChartPieItem[]
}

export function getDashboardCharts() {
  return request.get<{ code: number; data: ChartStatsData; message: string }>('/admin/dashboard/charts')
}

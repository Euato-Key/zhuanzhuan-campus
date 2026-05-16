import api from './index'

export interface RegionItem {
  name: string
  adcode: string
}

// 获取所有省份
export function getProvinces() {
  return api.get<{ code: number; data: RegionItem[]; message: string }>('/regions/provinces')
}

// 获取某省的城市
export function getCities(adcode: string) {
  return api.get<{ code: number; data: RegionItem[]; message: string }>('/regions/cities', {
    params: { adcode },
  })
}

// 获取某市的区县
export function getDistricts(adcode: string) {
  return api.get<{ code: number; data: RegionItem[]; message: string }>('/regions/districts', {
    params: { adcode },
  })
}
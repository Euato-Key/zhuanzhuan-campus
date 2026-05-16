import { env } from '../../config/env';

const AMAP_BASE_URL = 'https://restapi.amap.com/v3/config/district';

export interface RegionItem {
  name: string;
  adcode: string;
}

export interface CityItem extends RegionItem {
  districts: RegionItem[];
}

export interface ProvinceItem extends RegionItem {
  cities: CityItem[];
}

/**
 * 高德地图行政区域查询服务
 * 文档: https://lbs.amap.com/api/webservice/guide/api/district
 */
interface AmapDistrict {
  name: string;
  adcode: string;
  districts?: AmapDistrict[];
}

interface AmapResponse {
  status: string;
  info: string;
  districts?: AmapDistrict[];
}

export const RegionService = {
  async getDistrict(keywords: string = '中国', subdistrict: number = 1): Promise<AmapResponse> {
    const params = new URLSearchParams({
      key: env.AMAP_API_KEY,
      keywords,
      subdistrict: String(subdistrict),
      extensions: 'base',
    });

    const url = `${AMAP_BASE_URL}?${params}`;
    const response = await fetch(url);
    const data = await response.json() as AmapResponse;

    if (data.status !== '1') {
      throw new Error(`高德API错误: ${data.info}`);
    }

    return data;
  },

  /**
   * 获取所有省份
   */
  async getProvinces(): Promise<RegionItem[]> {
    const data = await this.getDistrict('中国', 1);
    if (data.districts?.[0]?.districts) {
      return data.districts[0].districts.map((p: AmapDistrict) => ({
        name: p.name,
        adcode: p.adcode,
      }));
    }
    return [];
  },

  /**
   * 获取某省的城市
   */
  async getCities(provinceAdcode: string): Promise<RegionItem[]> {
    const data = await this.getDistrict(provinceAdcode, 1);
    if (data.districts?.[0]?.districts) {
      return data.districts[0].districts.map((c: AmapDistrict) => ({
        name: c.name,
        adcode: c.adcode,
      }));
    }
    return [];
  },

  /**
   * 获取某市的区县
   */
  async getDistricts(cityAdcode: string): Promise<RegionItem[]> {
    const data = await this.getDistrict(cityAdcode, 1);
    if (data.districts?.[0]?.districts) {
      return data.districts[0].districts.map((d: AmapDistrict) => ({
        name: d.name,
        adcode: d.adcode,
      }));
    }
    return [];
  },
};

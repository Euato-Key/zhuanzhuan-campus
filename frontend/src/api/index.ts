import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response } = error
    if (response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    } else if (response?.data?.message) {
      ElMessage.error(response.data.message)
    }
    return Promise.reject(error)
  }
)

export default api
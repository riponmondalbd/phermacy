import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Attach token to every request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle auth errors globally
api.interceptors.response.use(
  res => res,
  async err => {
    const originalReq = err.config
    if (err.response?.status === 401 && !originalReq._retry) {
      originalReq._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (refreshToken) {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken })
          useAuthStore.getState().setToken(data.token)
          originalReq.headers.Authorization = `Bearer ${data.token}`
          return api(originalReq)
        }
      } catch (_) {}
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    const message = err.response?.data?.error || err.response?.data?.message || 'Something went wrong'
    if (err.response?.status !== 401) toast.error(message)
    return Promise.reject(err)
  }
)

export default api

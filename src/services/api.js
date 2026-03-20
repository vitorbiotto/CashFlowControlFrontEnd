import axios from 'axios'

const api = axios.create({
<<<<<<< HEAD
    baseURL: 'http://localhost:8080/api',
})

export const findAllRecords = async () => {
    const response = await api.get('/cash-flow')
    return response.data
}

export const createRecord = async (payload) => {
    const response = await api.post('/cash-flow', payload)
    return response.data
}

export default api
=======
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
})

export default api
>>>>>>> ac1f87fce7e12e54a1efb81c292c3acc544a029f

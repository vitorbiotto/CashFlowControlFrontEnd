import axios from 'axios'

const api = axios.create({
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
import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8080/api' //URL padrão do Spring Boot
});

export default api;
import axios from "axios";

// In Docker: nginx proxies /api/ to backend container
// In dev: direct call to localhost:8000
const baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL,
  timeout: 60000,
});

export default api;
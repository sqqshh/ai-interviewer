import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  timeout: 60000, // 60s — LLM calls can be slow
});

export default api;
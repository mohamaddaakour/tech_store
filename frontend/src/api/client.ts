import axios from 'axios'

export const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api',
});

// We build the API client
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiClient.get<T>(path);

  return res.data;
}

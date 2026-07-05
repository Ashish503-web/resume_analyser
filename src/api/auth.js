import { apiClient } from "./client";

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload).then((r) => r.data),
  login: (payload) => apiClient.post("/auth/login", payload).then((r) => r.data),
  logout: (payload) => apiClient.post("/auth/logout", payload).then((r) => r.data),
  me: (payload) => apiClient.get("/auth/me", payload).then((r) => r.data),
  updateProfile: (payload) => apiClient.patch("/auth/profile", payload).then((r) => r.data),
  changePassword: (payload) => apiClient.patch("/auth/password", payload).then((r) => r.data),  
};

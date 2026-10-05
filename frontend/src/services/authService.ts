import apiClient from "../api/apiClient";
import type { AuthResponse, SignInRequest, SignUpRequest } from "../interfaces";

export async function signIn(request: SignInRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/login", request);
  return data;
}

export async function signUp(request: SignUpRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/register", request);
  return data;
}

export async function signInWithGoogle(credential: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/api/auth/google", {
    credential,
  });
  return data;
}

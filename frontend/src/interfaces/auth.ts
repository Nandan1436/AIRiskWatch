import type { User } from "./user";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  username: string;
  password: string;
}

export interface StoredSession {
  token: string;
  user: User;
}

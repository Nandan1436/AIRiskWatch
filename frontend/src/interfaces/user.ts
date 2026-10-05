export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  has_password: boolean;
  has_google: boolean;
  email_notifications: boolean;
  created_at: string;
}

export interface UserUpdateRequest {
  username?: string;
  email_notifications?: boolean;
}

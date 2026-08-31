export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileDTO {
  email?: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  registrationAllowed?: boolean;
}

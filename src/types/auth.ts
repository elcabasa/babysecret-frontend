export interface Address {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  apartment?: string;
  postcode?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  role: "customer" | "admin";
  emailVerified: boolean;
  authProvider: "password" | "google";
  phone?: string;
  billing?: Address;
  shipping?: Address;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
}

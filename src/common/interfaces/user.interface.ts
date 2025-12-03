import { Role } from '@prisma/client';

export interface JwtUser {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
}

// Augment Express User type for Passport.js
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      name: string | null;
      role: Role;
      isActive: boolean;
    }
  }
}

import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    vendorProfileId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      vendorProfileId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    vendorProfileId?: string
  }
}

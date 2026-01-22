import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    vendorProfileId?: string
    relationshipLabel?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      vendorProfileId?: string
      relationshipLabel?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    vendorProfileId?: string
    relationshipLabel?: string | null
  }
}

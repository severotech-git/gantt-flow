// Augment @auth/core/types — this is where Session and User actually live in next-auth v5
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      activeAccountId: string;
      emailVerified: boolean;
      locale?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    activeAccountId?: string;
    emailVerified?: boolean;
    locale?: string;
  }
}

// Keep next-auth augmentation for server-side `auth()` usage
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      activeAccountId: string;
      emailVerified: boolean;
      locale?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    activeAccountId?: string;
    emailVerified?: boolean;
    locale?: string;
  }
}

import { handlers } from '@/auth';

// NextAuth requires Node.js runtime for database operations
export const runtime = 'nodejs';

export const { GET, POST } = handlers;

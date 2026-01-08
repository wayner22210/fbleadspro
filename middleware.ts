import type { NextRequest } from 'next/server';
import { proxy } from './proxy';

export default function middleware(req: NextRequest) {
  return proxy(req);
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};

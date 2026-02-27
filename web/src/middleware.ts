import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/hosts', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: '/login' };

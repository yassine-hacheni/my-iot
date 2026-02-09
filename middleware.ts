import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/setup', '/auth/callback'];
  
  // Skip middleware for public paths
  if (publicPaths.includes(pathname)) {
    return response;
  }

  try {
    // Check for user in localStorage
    const user = request.cookies.get('user')?.value;
    
    if (!user && !publicPaths.includes(pathname)) {
      // If no user is found and the path is not public, redirect to login
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // If user is found and tries to access login page, redirect to dashboard
    if (user && pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's an error, allow the request to continue
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
};
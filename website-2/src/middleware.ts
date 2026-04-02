import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protect everything inside /dashboard
const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])
const hasClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
  process.env.CLERK_SECRET_KEY?.trim()
)

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
    const { userId } = await auth()
    const configured = req.cookies.get("oakwell_workspace_configured")?.value === "true"
    if (userId && !configured) {
      return NextResponse.redirect(new URL("/onboarding", req.url))
    }
  }
})

export default hasClerk
  ? withClerk
  : function middleware(req: NextRequest) {
      if (isProtectedRoute(req)) {
        return new NextResponse("Authentication is not configured for protected routes.", {
          status: 503,
        });
      }
      return NextResponse.next()
    }

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

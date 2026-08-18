import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const publicPaths = new Set(["/login", "/offline"]);

function isPublicPath(pathname: string) {
  return publicPaths.has(pathname) || pathname.startsWith("/confirm/") || pathname.startsWith("/api/confirmations/") || pathname.startsWith("/technician-confirm/") || pathname.startsWith("/api/technician-confirmations/");
}

function secure(response: NextResponse, request: NextRequest) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  if (request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

function redirectWithCookies(url: URL, source: NextResponse, request: NextRequest) {
  const redirected = NextResponse.redirect(url);
  source.cookies.getAll().forEach(({ name, value, ...options }) => redirected.cookies.set(name, value, options));
  return secure(redirected, request);
}

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const isPublic = isPublicPath(url.pathname);

  if (!supabaseUrl || !publishableKey) {
    if (isPublic) return secure(NextResponse.next({ request }), request);
    url.pathname = "/login";
    url.search = "?error=configuration";
    return secure(NextResponse.redirect(url), request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic) {
    url.pathname = "/login";
    url.search = "?error=session";
    return redirectWithCookies(url, response, request);
  }

  if (signedIn && publicPaths.has(url.pathname)) {
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, response, request);
  }

  return secure(response, request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|og.png|manifest.webmanifest|sw.js|mineplus-icon.svg|mineplus-maskable.svg|icons/).*)"],
};

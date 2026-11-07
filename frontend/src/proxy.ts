import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasAcceptedPrivacy } from "@/lib/consent";
import { isAuthConfigured, isPreview, supabaseKey, supabaseUrl } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/preview");
  const isConsent = pathname === "/consent";
  const loginUrl = new URL("/login", request.url);

  // Public pages don't depend on who's signed in, so they skip the session work.
  if (!isDashboard && !isConsent && pathname !== "/login") return NextResponse.next();

  if (!isAuthConfigured) {
    return isDashboard && !isPreview ? NextResponse.redirect(loginUrl) : NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Checks the token's signature here, with no trip to Supabase, and refreshes an
  // expiring session. Real authorization happens in the backend.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Keeps any refreshed session cookies, which a plain redirect would lose.
  const go = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user) return isDashboard || isConsent ? go("/login") : response;

  // The order is login, then privacy, then the dashboard.
  const accepted = hasAcceptedPrivacy(user);
  if (pathname === "/login") return go(accepted ? "/dashboard" : "/consent");
  if (isDashboard && !accepted) return go("/consent");
  if (isConsent && accepted) return go("/dashboard");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};

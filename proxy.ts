import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = new Set<string>(["/discord/bot/callback", "/login"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  if (token) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/login", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

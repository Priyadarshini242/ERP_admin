import { NextResponse, type NextRequest } from "next/server";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
const PUBLIC = ["/login"];

/** Login gate. Only active when NEXT_PUBLIC_AUTH_ENABLED=true; otherwise every route is open. */
export function middleware(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const token = req.cookies.get("erp_token")?.value;

  if (PUBLIC.some((p) => pathname.startsWith(p))) {
    if (token && pathname === "/login") return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

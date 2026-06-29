import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = ["/login", "/forgot-password", "/api/auth"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      if (!isLoggedIn && !isPublic) return false;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.stationId = (user as any).stationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        (session.user as any).role = token.role;
        (session.user as any).stationId = token.stationId;
      }
      return session;
    },
  },
  providers: [],
};

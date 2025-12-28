import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      await connectDB();
      
      try {
        let existingUser = await User.findOne({ googleId: profile.sub });
        
        if (!existingUser) {
          existingUser = await User.create({
            googleId: profile.sub,
            name: profile.name,
            email: profile.email,
            picture: profile.picture,
          });
        } else {
          await existingUser.updateLoginTime();
        }
        
        user.id = existingUser._id.toString();
        return true;
      } catch (error) {
        console.error("Sign-in error:", error);
        return false;
      }
    },
    async session({ session, token }) {
      console.log("Session callback - token:", token);
      if (token?.sub) {
        await connectDB();
        // token.sub is the Google ID, but we need to get the user's MongoDB _id
        let user = await User.findOne({ googleId: token.sub });
        
        // Fallback: if not found by googleId, try finding by _id
        if (!user) {
          console.log("User not found by googleId, trying _id");
          user = await User.findById(token.sub).catch(() => null);
        }
        
        if (user) {
          session.user.id = user._id.toString();
          session.user._id = user._id.toString();
          session.user.accountType = user.accountType;
          console.log("Session updated with user ID:", session.user.id);
        } else {
          console.error("User not found for token.sub:", token.sub);
        }
      } else {
        console.error("No token.sub in session callback");
      }
      console.log("Final session.user:", session.user);
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      // Store the Google ID in the token on first sign-in
      if (account?.providerAccountId) {
        token.googleId = account.providerAccountId;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppRoutes } from "./routes/AppRoutes";
import { Footer, Navbar } from "./components/layout";
import { GOOGLE_CLIENT_ID } from "./config/env";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

export function App() {
  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-bg text-fg">
            <Navbar />
            <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 min-[901px]:px-10">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

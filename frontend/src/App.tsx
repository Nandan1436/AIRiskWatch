import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppRoutes } from "./routes/AppRoutes";
import { Sidebar } from "./components/layout";
import { GOOGLE_CLIENT_ID } from "./config/env";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

export function App() {
  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <div className="flex min-h-screen bg-bg text-fg">
            <Sidebar />
            <main className="min-w-0 flex-1">
              <AppRoutes />
            </main>
          </div>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

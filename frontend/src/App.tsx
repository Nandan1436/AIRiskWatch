import { AppRoutes } from "./routes/AppRoutes";
import { Sidebar } from "./components/layout";
import { ThemeProvider } from "./context/ThemeContext";

export function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-bg text-fg">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <AppRoutes />
        </main>
      </div>
    </ThemeProvider>
  );
}

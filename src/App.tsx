import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import PredictYield from "./pages/PredictYield";
import History from "./pages/History";
import Weather from "./pages/Weather";
import Recommendations from "./pages/Recommendations";
import Auth from "./pages/Auth";
import DataImport from "./pages/DataImport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/predict" element={<PredictYield />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/weather" element={<Weather />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                  <Route path="/admin/import" element={<DataImport />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

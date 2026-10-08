import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider, useAppConfig } from "@/ConfigProvider";
import Index from "./pages/Index";
import Versiculos from "./pages/Versiculos";
import Visitantes from "./pages/Visitantes";
import Jogos from "./pages/Jogos";
import Presenca from "./pages/Presenca";
import Bonus from "./pages/Bonus";
import Manual from "./pages/Manual";
import Dados from "./pages/Dados";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Get base path from vite config (set at build time)
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/er-ranking';

function AppRoutes() {
  const config = useAppConfig();
  const features = config?.features;

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      {features?.bibleVerses && <Route path="/versiculos" element={<Versiculos />} />}
      {features?.candidatoProgress && <Route path="/manual" element={<Manual />} />}
      {features?.visitorTracking && <Route path="/visitantes" element={<Visitantes />} />}
      {features?.games && <Route path="/jogos" element={<Jogos />} />}
      {features?.attendanceCalendar && <Route path="/presenca" element={<Presenca />} />}
      {features?.bonusPoints && <Route path="/bonus" element={<Bonus />} />}
      {features?.dataViewer && <Route path="/dados" element={<Dados />} />}
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter basename={basePath}>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;

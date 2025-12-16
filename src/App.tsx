import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Splash from "./pages/Splash";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import NowPlaying from "./pages/NowPlaying";
import SpotifyCallback from "./pages/SpotifyCallback";
import NotFound from "./pages/NotFound";
import AudioPlayer from "./components/player/AudioPlayer";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

const InitialRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only redirect if we're at root
      if (location.pathname === '/') {
        if (!session) {
          const isFirstVisit = !localStorage.getItem('youth_tunes_visited');
          if (isFirstVisit) {
            localStorage.setItem('youth_tunes_visited', 'true');
            navigate('/splash');
          } else {
            navigate('/auth');
          }
        }
      }
    };

    checkAuth();
  }, [navigate, location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AudioPlayer />
      <BrowserRouter>
        <InitialRedirect />
        <Routes>
          <Route path="/splash" element={<Splash />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="/player" element={<ProtectedRoute><NowPlaying /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/spotify/callback" element={<SpotifyCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

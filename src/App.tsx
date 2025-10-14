import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TireModels from "./pages/TireModels";
import Containers from "./pages/Containers";
import Tires from "./pages/Tires";
import Seasons from "./pages/Seasons";
import Drivers from "./pages/Drivers";
import Cars from "./pages/Cars";
import Operations from "./pages/Operations";
import Associations from "./pages/Associations";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tire-models"
            element={
              <ProtectedRoute>
                <Layout>
                  <TireModels />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/containers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Containers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tires"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tires />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/seasons"
            element={
              <ProtectedRoute>
                <Layout>
                  <Seasons />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/drivers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Drivers />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cars"
            element={
              <ProtectedRoute>
                <Layout>
                  <Cars />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/operations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Operations />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/associations"
            element={
              <ProtectedRoute>
                <Layout>
                  <Associations />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

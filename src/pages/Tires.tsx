import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Tire {
  id: string;
  barcode: string;
  status: string;
  position: string | null;
  tire_models: { name: string };
  drivers: { full_name: string } | null;
}

const Tires = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Tire | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tires")
        .select(`
          *,
          tire_models (name),
          drivers (full_name)
        `)
        .eq("barcode", searchQuery.trim())
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast({
            variant: "destructive",
            title: "Pneu não encontrado",
            description: "Nenhum pneu com este código foi encontrado.",
          });
          setSearchResult(null);
        } else {
          throw error;
        }
      } else {
        setSearchResult(data);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na busca",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      estoque: { variant: "default" as const, label: "Estoque", color: "text-success" },
      piloto: { variant: "secondary" as const, label: "Em Uso (Piloto)", color: "text-warning" },
      cup: { variant: "secondary" as const, label: "Cup", color: "text-success" },
      dsi: { variant: "destructive" as const, label: "DSI (Descartado)", color: "text-destructive" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.estoque;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Rastreamento de Pneus</h1>
        <p className="text-muted-foreground">
          Busque pneus por código de barras para ver histórico e status
        </p>
      </div>

      {/* Search Bar */}
      <Card className="border-border shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" />
            Buscar Pneu
          </CardTitle>
          <CardDescription>
            Escaneie ou digite o código de barras do pneu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite ou escaneie o código de barras..."
                className="pl-10"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <Card className="border-border shadow-[var(--shadow-card)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informações do Pneu</CardTitle>
              {getStatusBadge(searchResult.status)}
            </div>
            <CardDescription>Código: {searchResult.barcode}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                  <p className="text-lg font-semibold text-foreground">
                    {searchResult.tire_models.name}
                  </p>
                </div>
                
                {searchResult.drivers && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Piloto Atual</p>
                    <p className="text-lg font-semibold text-foreground">
                      {searchResult.drivers.full_name}
                    </p>
                  </div>
                )}
                
                {searchResult.position && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Posição</p>
                    <p className="text-lg font-semibold text-foreground">
                      {searchResult.position}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  O histórico completo será implementado em breve.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tires;

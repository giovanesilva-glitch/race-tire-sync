import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ScanBarcode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TireHistory {
  id: string;
  created_at: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  from_location_type: string | null;
  to_location_type: string | null;
  position: string | null;
  performed_by: string | null;
}

interface Tire {
  id: string;
  barcode: string;
  status: string;
  position: string | null;
  current_driver_id: string | null;
  created_at: string;
  tire_models: { name: string; type: string; compound: string | null };
  drivers?: { full_name: string; nickname: string | null };
}

const Tires = () => {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [tire, setTire] = useState<Tire | null>(null);
  const [history, setHistory] = useState<TireHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTire(null);
    setHistory([]);

    try {
      const { data, error } = await supabase
        .from("tires")
        .select("*, tire_models(name, type, compound), drivers(full_name, nickname)")
        .eq("barcode", barcode)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          variant: "destructive",
          title: "Pneu não encontrado",
          description: "Nenhum pneu com este código foi encontrado.",
        });
        return;
      }

      setTire(data);

      // Buscar histórico
      const { data: historyData, error: historyError } = await supabase
        .from("tire_history")
        .select("*")
        .eq("tire_id", data.id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      setHistory(historyData || []);

      toast({
        title: "Pneu encontrado!",
        description: `Status: ${data.status}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar pneu",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      estoque: { variant: "default" as const, label: "Estoque" },
      piloto: { variant: "secondary" as const, label: "Em Uso (Piloto)" },
      cup: { variant: "secondary" as const, label: "Cup" },
      dsi: { variant: "destructive" as const, label: "DSI (Descartado)" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.estoque;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Rastreamento de Pneus</h1>
        <p className="text-muted-foreground">
          Busque pneus por código de barras para ver histórico e status
        </p>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
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
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
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

      {tire && (
        <Card className="border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informações do Pneu</CardTitle>
              {getStatusBadge(tire.status)}
            </div>
            <CardDescription>Código: {tire.barcode}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                  <p className="text-lg font-semibold">
                    {tire.tire_models.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tire.tire_models.type}
                    {tire.tire_models.compound && ` - ${tire.tire_models.compound}`}
                  </p>
                </div>

                {tire.drivers && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Piloto Atual</p>
                    <p className="text-lg font-semibold">
                      {tire.drivers.full_name}
                      {tire.drivers.nickname && ` (${tire.drivers.nickname})`}
                    </p>
                  </div>
                )}

                {tire.position && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Posição</p>
                    <p className="text-lg font-semibold">{tire.position}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                  <p className="text-lg font-semibold">
                    {new Date(tire.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {/* Histórico */}
              {history.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-xl font-bold mb-4">Histórico Completo</h3>
                  <div className="space-y-3">
                    {history.map((event) => (
                      <Card key={event.id} className="border-border bg-card/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium capitalize">{event.event_type}</p>
                              {event.from_status && event.to_status && (
                                <p className="text-sm text-muted-foreground">
                                  Status: {event.from_status} → {event.to_status}
                                </p>
                              )}
                              {event.from_location_type && event.to_location_type && (
                                <p className="text-sm text-muted-foreground">
                                  Local: {event.from_location_type} → {event.to_location_type}
                                </p>
                              )}
                              {event.position && (
                                <p className="text-sm text-muted-foreground">
                                  Posição: {event.position}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tires;

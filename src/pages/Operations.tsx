import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, Upload, Download, ClipboardCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TireModel {
  id: string;
  name: string;
}

interface Container {
  id: string;
  name: string;
}

const Operations = () => {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);

  useEffect(() => {
    fetchTireModels();
    fetchContainers();
  }, []);

  const fetchTireModels = async () => {
    const { data } = await supabase.from("tire_models").select("id, name").order("name");
    setTireModels(data || []);
  };

  const fetchContainers = async () => {
    const { data } = await supabase.from("containers").select("id, name").order("name");
    setContainers(data || []);
  };

  const handleIngestSingle = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Verificar se o código já existe
      const { data: existingTire } = await supabase
        .from("tires")
        .select("id")
        .eq("barcode", barcode)
        .maybeSingle();

      if (existingTire) {
        toast({
          variant: "destructive",
          title: "Código já existe",
          description: "Este código de barras já está cadastrado no sistema.",
        });
        return;
      }

      // Criar o pneu
      const { data: newTire, error } = await supabase
        .from("tires")
        .insert([
          {
            barcode,
            model_id: selectedModel,
            current_location_type: "container",
            current_location_id: selectedContainer,
            status: "estoque",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico
      await supabase.from("tire_history").insert([
        {
          tire_id: newTire.id,
          event_type: "created",
          to_status: "estoque",
          to_location_type: "container",
          to_location_id: selectedContainer,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      toast({
        title: "Pneu registrado com sucesso!",
        description: `Código: ${barcode}`,
      });

      setBarcode("");
      setSelectedModel("");
      setSelectedContainer("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar pneu",
        description: error.message,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Operações de Pneus</h1>
        <p className="text-muted-foreground">Gerencie o ciclo de vida dos pneus</p>
      </div>

      <Tabs defaultValue="ingest" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ingest">
            <Package className="mr-2 h-4 w-4" />
            Entrada
          </TabsTrigger>
          <TabsTrigger value="dispatch">
            <Upload className="mr-2 h-4 w-4" />
            Saída
          </TabsTrigger>
          <TabsTrigger value="return">
            <Download className="mr-2 h-4 w-4" />
            Devolução
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingest" className="space-y-4">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Entrada Individual de Pneu</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIngestSingle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras *</Label>
                  <Input
                    id="barcode"
                    placeholder="Escaneie ou digite o código"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo do Pneu *</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tireModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="container">Contêiner de Destino *</Label>
                  <Select value={selectedContainer} onValueChange={setSelectedContainer} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o contêiner" />
                    </SelectTrigger>
                    <SelectContent>
                      {containers.map((container) => (
                        <SelectItem key={container.id} value={container.id}>
                          {container.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Registrar Pneu
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Importação em Lote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Faça upload de uma planilha com múltiplos pneus para registro rápido.
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo de Planilha
              </Button>
              <Input type="file" accept=".xlsx,.csv" />
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Importar Planilha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Saída para Pista</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Importe planilhas de consumo para registrar a saída de pneus para os pilotos.
              </p>
              <Button variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Baixar Modelo de Planilha
              </Button>
              <Input type="file" accept=".xlsx,.csv" />
              <Button className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Importar Planilha de Consumo
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="return">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Devolução de Pneus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Processe a devolução de pneus após o uso (Cup ou DSI).
              </p>
              <div className="space-y-2">
                <Label htmlFor="return-barcode">Código de Barras</Label>
                <Input
                  id="return-barcode"
                  placeholder="Escaneie o pneu"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="w-full">
                  Cup (Retorna ao Estoque)
                </Button>
                <Button variant="destructive" className="w-full">
                  DSI (Inservível)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Auditoria de Contêiner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Valide o inventário físico de um contêiner escaneando todos os pneus.
              </p>
              <div className="space-y-2">
                <Label htmlFor="audit-container">Contêiner</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contêiner para auditar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">Em desenvolvimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Iniciar Auditoria
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Operations;

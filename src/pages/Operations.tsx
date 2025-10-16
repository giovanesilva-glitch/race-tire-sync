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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";
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

interface Driver {
  id: string;
  full_name: string;
  nickname: string | null;
}

const Operations = () => {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  
  // Dispatch states
  const [dispatchBarcode, setDispatchBarcode] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Return states
  const [returnBarcode, setReturnBarcode] = useState("");
  
  // Audit states
  const [auditContainer, setAuditContainer] = useState("");
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [auditBarcode, setAuditBarcode] = useState("");
  
  // Alert states
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  
  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [discardPolicy, setDiscardPolicy] = useState<"usar" | "nao_usar">("usar");

  useEffect(() => {
    fetchTireModels();
    fetchContainers();
    fetchDrivers();
  }, []);

  const fetchTireModels = async () => {
    const { data } = await supabase.from("tire_models").select("id, name").order("name");
    setTireModels(data || []);
  };

  const fetchContainers = async () => {
    const { data } = await supabase.from("containers").select("id, name").order("name");
    setContainers(data || []);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from("drivers").select("id, full_name, nickname").order("full_name");
    setDrivers(data || []);
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
        // Se existe, usar RPC para mover para contêiner
        const user = (await supabase.auth.getUser()).data.user;
        const { data: result, error: rpcError } = await supabase.rpc("scan_into_container", {
          p_barcode: barcode,
          p_container_id: selectedContainer,
          p_user: user?.id,
        });

        if (rpcError) throw rpcError;

        const resultObj = result as { ok: boolean; code: string; message?: string };

        if (resultObj?.code === "blocked_piloto_in_dsi") {
          setAlertOpen(true);
          setAlertTitle("BLOQUEADO");
          setAlertMessage("Pneu de PILOTO não pode entrar em contêiner DSI.");
          return;
        }

        if (resultObj?.code === "ok_dsi") {
          toast({ title: "Movido para DSI", description: `Pneu ${barcode} enviado para retorno.` });
        } else if (resultObj?.code === "ok_container") {
          toast({ title: "Movido para contêiner", description: `Pneu ${barcode} posicionado.` });
        }

        setBarcode("");
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

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: tire, error: fetchError } = await supabase
        .from("tires")
        .select("id, status, current_location_type")
        .eq("barcode", dispatchBarcode)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!tire) {
        toast({
          variant: "destructive",
          title: "Pneu não encontrado",
          description: "Este código de barras não existe no sistema.",
        });
        return;
      }

      if (tire.status !== "estoque") {
        toast({
          variant: "destructive",
          title: "Pneu não disponível",
          description: "Este pneu não está em estoque.",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("tires")
        .update({
          status: "piloto",
          current_location_type: "piloto",
          current_location_id: selectedDriver,
          current_driver_id: selectedDriver,
          position: selectedPosition,
        })
        .eq("id", tire.id);

      if (updateError) throw updateError;

      await supabase.from("tire_history").insert([
        {
          tire_id: tire.id,
          event_type: "assigned_to_driver",
          from_status: "estoque",
          to_status: "piloto",
          from_location_type: tire.current_location_type,
          to_location_type: "piloto",
          to_location_id: selectedDriver,
          driver_id: selectedDriver,
          position: selectedPosition,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      toast({
        title: "Pneu despachado com sucesso!",
        description: `Código: ${dispatchBarcode}`,
      });

      setDispatchBarcode("");
      setSelectedDriver("");
      setSelectedPosition("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao despachar pneu",
        description: error.message,
      });
    }
  };

  const handleReturn = async (returnType: "cup" | "dsi") => {
    if (!returnBarcode.trim()) {
      toast({
        variant: "destructive",
        title: "Código obrigatório",
        description: "Digite o código de barras do pneu.",
      });
      return;
    }

    try {
      const { data: tire, error: fetchError } = await supabase
        .from("tires")
        .select("id, status, current_location_type, current_driver_id")
        .eq("barcode", returnBarcode)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!tire) {
        toast({
          variant: "destructive",
          title: "Pneu não encontrado",
          description: "Este código de barras não existe no sistema.",
        });
        return;
      }

      if (tire.status !== "piloto") {
        toast({
          variant: "destructive",
          title: "Pneu não está com piloto",
          description: "Este pneu não pode ser devolvido.",
        });
        return;
      }

      const newStatus = returnType === "cup" ? "cup" : "dsi";
      const newLocationType = returnType === "cup" ? "container" : "none";

      const { error: updateError } = await supabase
        .from("tires")
        .update({
          status: newStatus,
          current_location_type: newLocationType,
          current_location_id: null,
          current_driver_id: null,
          position: null,
        })
        .eq("id", tire.id);

      if (updateError) throw updateError;

      await supabase.from("tire_history").insert([
        {
          tire_id: tire.id,
          event_type: "returned",
          from_status: "piloto",
          to_status: newStatus,
          from_location_type: tire.current_location_type,
          to_location_type: newLocationType,
          driver_id: tire.current_driver_id,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
        },
      ]);

      toast({
        title: "Devolução registrada!",
        description: `Pneu marcado como ${returnType === "cup" ? "Cup (reutilizável)" : "DSI (descartado)"}.`,
      });

      setReturnBarcode("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao processar devolução",
        description: error.message,
      });
    }
  };

  const handleAuditScan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auditContainer) {
      toast({
        variant: "destructive",
        title: "Selecione um contêiner",
        description: "Escolha o contêiner para auditar.",
      });
      return;
    }

    if (scannedBarcodes.includes(auditBarcode)) {
      toast({
        variant: "destructive",
        title: "Pneu já escaneado",
        description: "Este código já foi registrado nesta auditoria.",
      });
      setAuditBarcode("");
      return;
    }

    const { data: tire } = await supabase
      .from("tires")
      .select("id, barcode, current_location_id")
      .eq("barcode", auditBarcode)
      .maybeSingle();

    if (!tire) {
      toast({
        variant: "destructive",
        title: "Pneu não encontrado",
        description: "Este código não existe no sistema.",
      });
      return;
    }

    setScannedBarcodes([...scannedBarcodes, auditBarcode]);
    setAuditBarcode("");

    toast({
      title: "Pneu registrado na auditoria",
      description: `Total: ${scannedBarcodes.length + 1} pneus`,
    });
  };

  const finishAudit = async () => {
    if (scannedBarcodes.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum pneu escaneado",
        description: "Escaneie ao menos um pneu antes de finalizar.",
      });
      return;
    }

    const { data: expectedTires } = await supabase
      .from("tires")
      .select("barcode")
      .eq("current_location_id", auditContainer)
      .eq("current_location_type", "container");

    const expectedBarcodes = expectedTires?.map((t) => t.barcode) || [];
    const missing = expectedBarcodes.filter((b) => !scannedBarcodes.includes(b));
    const extra = scannedBarcodes.filter((b) => !expectedBarcodes.includes(b));

    toast({
      title: "Auditoria concluída",
      description: `Esperado: ${expectedBarcodes.length} | Encontrado: ${scannedBarcodes.length} | Faltando: ${missing.length} | Extra: ${extra.length}`,
    });

    setScannedBarcodes([]);
    setAuditContainer("");
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "Arquivo necessário",
        description: "Selecione uma planilha para importar.",
      });
      return;
    }

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        toast({
          variant: "destructive",
          title: "Planilha vazia",
          description: "A planilha não contém dados.",
        });
        return;
      }

      // Identificar colunas
      const headers = jsonData[0].map((h: string) => String(h || "").toLowerCase());
      const rows = jsonData.slice(1);

      const user = (await supabase.auth.getUser()).data.user;
      let processed = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const rowData: any = {};
          headers.forEach((h: string, i: number) => {
            rowData[h] = row[i];
          });

          const code = String(rowData.codigo || rowData.barcode || "").trim();
          if (!code) continue;

          const cond = String(rowData.condicao || rowData.condition || "").toLowerCase();
          
          let toStatus: "estoque" | "piloto" | "cup" | "descartado" | "dsi" = "estoque";
          let toLocType: "container" | "piloto" | "none" = "container";
          let toLocId: string | null = selectedContainer;

          if (cond.includes("guard")) {
            toStatus = "piloto";
            toLocType = "piloto";
            // Precisaria do driver_id aqui
          } else if (cond.includes("descart")) {
            if (discardPolicy === "usar") {
              toStatus = "cup";
              toLocType = "container";
              toLocId = selectedContainer;
            } else {
              toStatus = "descartado";
              toLocType = "none";
              toLocId = null;
            }
          }

          // Buscar ou criar pneu
          const { data: tire } = await supabase
            .from("tires")
            .select("id")
            .eq("barcode", code)
            .maybeSingle();

          if (tire) {
            await supabase
              .from("tires")
              .update({
                status: toStatus,
                current_location_type: toLocType,
                current_location_id: toLocId,
              })
              .eq("id", tire.id);
          } else {
            const { data: newTire } = await supabase
              .from("tires")
              .insert([{
                barcode: code,
                model_id: selectedModel,
                status: toStatus,
                current_location_type: toLocType,
                current_location_id: toLocId,
              }])
              .select()
              .single();

            if (newTire) {
              await supabase.from("tire_history").insert([{
                tire_id: newTire.id,
                event_type: "created",
                to_status: toStatus,
                to_location_type: toLocType,
                to_location_id: toLocId,
                performed_by: user?.id,
                metadata: rowData,
              }]);
            }
          }

          processed++;
        } catch (err) {
          errors++;
          console.error("Error processing row:", err);
        }
      }

      toast({
        title: "Importação concluída",
        description: `${processed} pneus processados, ${errors} erros.`,
      });

      setImportFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
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
              
              <div className="space-y-2">
                <Label>Modelo do Pneu (para novos) *</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="">Selecione o modelo</option>
                  {tireModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Contêiner de Destino *</Label>
                <select 
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedContainer}
                  onChange={(e) => setSelectedContainer(e.target.value)}
                >
                  <option value="">Selecione o contêiner</option>
                  {containers.map((container) => (
                    <option key={container.id} value={container.id}>
                      {container.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border p-3 space-y-2">
                <div className="font-medium">Quando a planilha indicar DESCARTADO</div>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={discardPolicy === 'usar' ? 'default' : 'outline'} 
                    onClick={() => setDiscardPolicy('usar')}
                  >
                    Vamos usar (CUP)
                  </Button>
                  <Button 
                    type="button"
                    variant={discardPolicy === 'nao_usar' ? 'default' : 'outline'} 
                    onClick={() => setDiscardPolicy('nao_usar')}
                  >
                    Não usar (DESCARTADO)
                  </Button>
                </div>
              </div>

              <Input 
                type="file" 
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              
              <Button 
                className="w-full" 
                onClick={handleImportFile}
                disabled={!importFile || !selectedModel || !selectedContainer}
              >
                <Upload className="mr-2 h-4 w-4" />
                Processar Planilha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Despacho para Piloto</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDispatch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dispatch-barcode">Código de Barras *</Label>
                  <Input
                    id="dispatch-barcode"
                    placeholder="Escaneie o pneu"
                    value={dispatchBarcode}
                    onChange={(e) => setDispatchBarcode(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver">Piloto *</Label>
                  <Select value={selectedDriver} onValueChange={setSelectedDriver} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o piloto" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name}
                          {driver.nickname && ` (${driver.nickname})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Posição *</Label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a posição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dianteiro Esquerdo">Dianteiro Esquerdo</SelectItem>
                      <SelectItem value="Dianteiro Direito">Dianteiro Direito</SelectItem>
                      <SelectItem value="Traseiro Esquerdo">Traseiro Esquerdo</SelectItem>
                      <SelectItem value="Traseiro Direito">Traseiro Direito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Despachar Pneu
                </Button>
              </form>
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
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleReturn("cup")}
                >
                  Cup (Reutilizável)
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => handleReturn("dsi")}
                >
                  DSI (Descartado)
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
                <Select value={auditContainer} onValueChange={setAuditContainer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contêiner para auditar" />
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
              
              {auditContainer && (
                <>
                  <form onSubmit={handleAuditScan} className="space-y-2">
                    <Label htmlFor="audit-barcode">Escanear Pneu</Label>
                    <div className="flex gap-2">
                      <Input
                        id="audit-barcode"
                        placeholder="Código de barras"
                        value={auditBarcode}
                        onChange={(e) => setAuditBarcode(e.target.value)}
                        autoFocus
                      />
                      <Button type="submit">Adicionar</Button>
                    </div>
                  </form>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      Pneus escaneados: {scannedBarcodes.length}
                    </p>
                    {scannedBarcodes.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {scannedBarcodes.map((code, index) => (
                          <div key={index} className="text-xs text-muted-foreground">
                            {code}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button className="w-full" onClick={finishAudit}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Finalizar Auditoria
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{alertTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Operations;

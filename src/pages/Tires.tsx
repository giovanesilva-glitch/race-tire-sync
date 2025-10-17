import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ScanBarcode, Upload, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface ImportPreviewRow {
  codigo: string;
  modelo: string;
  container: string;
  data_hora: string;
  isDuplicate?: boolean;
}

const Tires = () => {
  const { toast } = useToast();
  const [barcode, setBarcode] = useState("");
  const [tire, setTire] = useState<Tire | null>(null);
  const [history, setHistory] = useState<TireHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<"update" | "ignore">("ignore");
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [processingImport, setProcessingImport] = useState(false);

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

  const handleDownloadTemplate = () => {
    const template = [
      { CÓDIGO: "5125587", MODELO: "31/71-18 Porsche Cup N3R", CONTÊINER: "HAMU 2475000", "DATA E HORA": "09/10/2025 13:11:25" },
      { CÓDIGO: "5125564", MODELO: "31/71-18 Porsche Cup N3R", CONTÊINER: "HAMU 2475000", "DATA E HORA": "09/10/2025 13:11:25" },
      { CÓDIGO: "5030568", MODELO: "27/65-18 Porsche Cup N2", CONTÊINER: "HAMU 2475000", "DATA E HORA": "09/10/2025 13:12:43" },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Banco de Dados");
    XLSX.writeFile(wb, "template_importacao_pneus.xlsx");

    toast({
      title: "Template baixado!",
      description: "Use este arquivo como modelo para importação.",
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);

      // Procurar pela aba "Banco de Dados"
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes("banco") || name.toLowerCase().includes("dados")
      );

      if (!sheetName) {
        toast({
          variant: "destructive",
          title: "Aba não encontrada",
          description: 'A planilha deve conter uma aba chamada "Banco de Dados".',
        });
        setImportFile(null);
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Encontrar linha de cabeçalho
      const headerRow = jsonData.find(row =>
        row.some(cell => 
          cell?.toString().toUpperCase().includes("CÓDIGO") ||
          cell?.toString().toUpperCase().includes("CODIGO")
        )
      );

      if (!headerRow) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Não foi possível encontrar o cabeçalho com as colunas esperadas.",
        });
        setImportFile(null);
        return;
      }

      // Encontrar índices das colunas
      const codigoIdx = headerRow.findIndex(cell => 
        cell?.toString().toUpperCase().includes("CÓDIGO") ||
        cell?.toString().toUpperCase().includes("CODIGO")
      );
      const modeloIdx = headerRow.findIndex(cell => 
        cell?.toString().toUpperCase().includes("MODELO")
      );
      const containerIdx = headerRow.findIndex(cell => 
        cell?.toString().toUpperCase().includes("CONTÊINER") ||
        cell?.toString().toUpperCase().includes("CONTEINER") ||
        cell?.toString().toUpperCase().includes("CONTAINER")
      );
      const dataHoraIdx = headerRow.findIndex(cell => 
        cell?.toString().toUpperCase().includes("DATA")
      );

      if (codigoIdx === -1 || modeloIdx === -1 || containerIdx === -1 || dataHoraIdx === -1) {
        toast({
          variant: "destructive",
          title: "Planilha inválida",
          description: "Certifique-se de que a aba 'Banco de Dados' contém as colunas CÓDIGO, MODELO, CONTÊINER e DATA E HORA.",
        });
        setImportFile(null);
        return;
      }

      const headerRowIdx = jsonData.indexOf(headerRow);
      const preview: ImportPreviewRow[] = [];

      // Processar linhas
      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const codigo = row[codigoIdx]?.toString().trim();
        const modelo = row[modeloIdx]?.toString().trim();
        const container = row[containerIdx]?.toString().trim();
        const data_hora = row[dataHoraIdx]?.toString().trim();

        if (!codigo || !modelo || !container || !data_hora) continue;

        // Verificar se já existe
        const { data: existing } = await supabase
          .from("tires")
          .select("id")
          .eq("barcode", codigo)
          .maybeSingle();

        preview.push({
          codigo,
          modelo,
          container,
          data_hora,
          isDuplicate: !!existing,
        });
      }

      setPreviewData(preview);
      setShowPreview(true);

      const duplicates = preview.filter(p => p.isDuplicate).length;
      if (duplicates > 0) {
        toast({
          title: "Duplicados encontrados",
          description: `${duplicates} pneu(s) já existem no banco. Você poderá escolher se deseja atualizar ou ignorar.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao processar arquivo",
        description: error.message,
      });
      setImportFile(null);
    }
  };

  const handleConfirmImport = async () => {
    if (previewData.some(p => p.isDuplicate)) {
      setShowPreview(false);
      setShowDuplicateDialog(true);
      return;
    }

    await processImport();
  };

  const processImport = async () => {
    setProcessingImport(true);
    setShowDuplicateDialog(false);
    setShowPreview(false);

    let imported = 0;
    let updated = 0;
    let ignored = 0;
    const containersSet = new Set<string>();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const row of previewData) {
        containersSet.add(row.container);

        // Buscar ou criar modelo
        let { data: modelData } = await supabase
          .from("tire_models")
          .select("id")
          .eq("name", row.modelo)
          .maybeSingle();

        if (!modelData) {
          const { data: newModel } = await supabase
            .from("tire_models")
            .insert({ name: row.modelo, type: "Cup" })
            .select()
            .single();
          modelData = newModel;
        }

        // Buscar ou criar container
        let { data: containerData } = await supabase
          .from("containers")
          .select("id")
          .eq("name", row.container)
          .maybeSingle();

        if (!containerData) {
          const { data: newContainer } = await supabase
            .from("containers")
            .insert({ name: row.container, capacity: 300, is_dsi: false })
            .select()
            .single();
          containerData = newContainer;
        }

        if (row.isDuplicate) {
          if (duplicateAction === "update") {
            await supabase
              .from("tires")
              .update({
                model_id: modelData!.id,
                current_location_id: containerData!.id,
                current_location_type: "container",
                updated_at: new Date().toISOString(),
              })
              .eq("barcode", row.codigo);
            updated++;
          } else {
            ignored++;
          }
        } else {
          await supabase.from("tires").insert({
            barcode: row.codigo,
            model_id: modelData!.id,
            status: "estoque",
            current_location_type: "container",
            current_location_id: containerData!.id,
          });

          // Registrar no histórico
          const { data: tireData } = await supabase
            .from("tires")
            .select("id")
            .eq("barcode", row.codigo)
            .single();

          if (tireData && user) {
            await supabase.from("tire_history").insert([{
              tire_id: tireData.id,
              event_type: "created",
              from_status: null,
              to_status: "estoque",
              from_location_type: null,
              to_location_type: "container",
              to_location_id: containerData!.id,
              performed_by: user.id,
            }]);
          }

          imported++;
        }
      }

      toast({
        title: "Importação concluída!",
        description: `${imported} pneus importados, ${updated} atualizados, ${ignored} ignorados. ${containersSet.size} container(s) identificado(s).`,
      });

      setPreviewData([]);
      setImportFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error.message,
      });
    } finally {
      setProcessingImport(false);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Rastreamento de Pneus</h1>
          <p className="text-muted-foreground">
            Busque pneus por código de barras para ver histórico e status
          </p>
        </div>
        <Button onClick={handleDownloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Baixar Modelo de Planilha
        </Button>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação em Massa
          </CardTitle>
          <CardDescription>
            Importe múltiplos pneus de uma vez através de planilha Excel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                A planilha deve conter uma aba "Banco de Dados" com as colunas: CÓDIGO, MODELO, CONTÊINER e DATA E HORA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Dialog de Prévia */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia da Importação</DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar. Primeiras linhas mostradas abaixo:
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Contêiner</TableHead>
                  <TableHead>Data e Hora</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 5).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{row.codigo}</TableCell>
                    <TableCell>{row.modelo}</TableCell>
                    <TableCell>{row.container}</TableCell>
                    <TableCell>{row.data_hora}</TableCell>
                    <TableCell>
                      {row.isDuplicate ? (
                        <Badge variant="secondary">Duplicado</Badge>
                      ) : (
                        <Badge>Novo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-muted-foreground">
            Total de registros: {previewData.length} | 
            Novos: {previewData.filter(p => !p.isDuplicate).length} | 
            Duplicados: {previewData.filter(p => p.isDuplicate).length}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={processingImport}>
              {processingImport ? "Processando..." : "Confirmar Importação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Ação para Duplicados */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registros Duplicados Encontrados</AlertDialogTitle>
            <AlertDialogDescription>
              Foram encontrados {previewData.filter(p => p.isDuplicate).length} pneu(s) que já existem no banco de dados.
              O que você deseja fazer com eles?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDuplicateAction("ignore");
              setShowDuplicateDialog(false);
              setShowPreview(true);
            }}>
              Voltar
            </AlertDialogCancel>
            <Button variant="outline" onClick={() => {
              setDuplicateAction("ignore");
              processImport();
            }}>
              Ignorar Duplicados
            </Button>
            <AlertDialogAction onClick={() => {
              setDuplicateAction("update");
              processImport();
            }}>
              Atualizar Existentes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tires;

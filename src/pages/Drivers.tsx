import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Edit2, Trash2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Driver {
  id: string;
  full_name: string;
  nickname: string | null;
  created_at: string;
}

const Drivers = () => {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({ full_name: "", nickname: "" });
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pilotos",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        const { error } = await supabase
          .from("drivers")
          .update(formData)
          .eq("id", editingDriver.id);

        if (error) throw error;

        toast({ title: "Piloto atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from("drivers").insert([formData]);

        if (error) throw error;

        toast({ title: "Piloto criado com sucesso!" });
      }

      setFormData({ full_name: "", nickname: "" });
      setEditingDriver(null);
      setDialogOpen(false);
      fetchDrivers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar piloto",
        description: error.message,
      });
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({ full_name: driver.full_name, nickname: driver.nickname || "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("drivers").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Piloto excluído com sucesso!" });
      fetchDrivers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir piloto",
        description: error.message,
      });
    }
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "Selecione um arquivo",
        description: "Por favor, selecione uma planilha para importar.",
      });
      return;
    }

    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Encontrar índices das colunas ID e PILOTO
      const headerRow = jsonData.find(row => 
        row.some(cell => cell === "ID" || cell === "PILOTO")
      );

      if (!headerRow) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Planilha não contém as colunas esperadas (ID, PILOTO).",
        });
        return;
      }

      const idIndex = headerRow.indexOf("ID");
      const pilotoIndex = headerRow.indexOf("PILOTO");
      const headerRowIndex = jsonData.indexOf(headerRow);

      if (idIndex === -1 || pilotoIndex === -1) {
        toast({
          variant: "destructive",
          title: "Colunas faltando",
          description: "Planilha precisa ter as colunas ID e PILOTO.",
        });
        return;
      }

      let imported = 0;
      let updated = 0;

      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const id = row[idIndex];
        const piloto = row[pilotoIndex];

        if (!id || !piloto || piloto === "Reserva") continue;

        // Verificar se o piloto já existe pelo nickname (ID da planilha)
        const { data: existing } = await supabase
          .from("drivers")
          .select("*")
          .eq("nickname", id.toString())
          .maybeSingle();

        if (existing) {
          // Atualizar nome completo se mudou
          if (existing.full_name !== piloto) {
            await supabase
              .from("drivers")
              .update({ full_name: piloto })
              .eq("id", existing.id);
            updated++;
          }
        } else {
          // Inserir novo piloto
          await supabase.from("drivers").insert([{
            full_name: piloto,
            nickname: id.toString(),
          }]);
          imported++;
        }
      }

      toast({
        title: "Importação concluída!",
        description: `${imported} pilotos importados, ${updated} atualizados.`,
      });

      setImportFile(null);
      fetchDrivers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao importar",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Pilotos</h1>
          <p className="text-muted-foreground">Gerencie os pilotos da competição</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingDriver(null);
              setFormData({ full_name: "", nickname: "" });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Piloto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDriver ? "Editar Piloto" : "Novo Piloto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nickname">Apelido</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingDriver ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Importação em Lote</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">Planilha de Pilotos Confirmados</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Formato esperado: colunas ID e PILOTO
              </p>
            </div>
            <Button onClick={handleImportFile} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Processar Planilha
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Pilotos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome Completo</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.full_name}</TableCell>
                  <TableCell>{driver.nickname || "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(driver)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(driver.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Drivers;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface CT { id: string; name: string }

const CompanyTypes = () => {
  const [items, setItems] = useState<CT[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    supabase.from("company_types").select("*").order("name")
      .then(({ data }) => setItems((data ?? []) as CT[]));
  }, [reload]);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("company_types").insert({ name: name.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Tipo criado"); setName(""); setOpen(false); setReload((k) => k + 1); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("company_types").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); setReload((k) => k + 1); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tipos de Empresa</h1>
          <p className="text-sm text-muted-foreground">Categorização das empresas clientes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo tipo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo tipo de empresa</DialogTitle></DialogHeader>
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead className="w-16" /></TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">Nenhum tipo cadastrado</TableCell></TableRow>}
            {items.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <ConfirmDialog trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                    title="Remover tipo?" description="Clientes vinculados ficarão sem tipo." destructive
                    onConfirm={() => remove(c.id)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default CompanyTypes;

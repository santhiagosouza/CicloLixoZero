import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Sector { id: string; name: string; active: boolean; }

const Sectors = () => {
  const { clientId, isClientAdmin } = useAuth();
  const [items, setItems] = useState<Sector[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    supabase.from("sectors").select("*").eq("client_id", clientId).order("name")
      .then(({ data }) => setItems((data ?? []) as Sector[]));
  }, [clientId, reload]);

  const create = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("sectors").insert({ client_id: clientId!, name: name.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Setor criado"); setName(""); setOpen(false); setReload((k) => k + 1); }
  };

  const toggle = async (s: Sector) => {
    const { error } = await supabase.from("sectors").update({ active: !s.active }).eq("id", s.id);
    if (error) toast.error(error.message); else setReload((k) => k + 1);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("sectors").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); setReload((k) => k + 1); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Setores</h1>
          <p className="text-sm text-muted-foreground">Defina os setores onde as pesagens serão realizadas</p>
        </div>
        {isClientAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo setor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo setor</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Ativo</TableHead><TableHead className="w-16" />
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Nenhum setor</TableCell></TableRow>}
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell><Switch checked={s.active} onCheckedChange={() => toggle(s)} disabled={!isClientAdmin} /></TableCell>
                <TableCell>
                  {isClientAdmin && (
                    <ConfirmDialog
                      trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                      title="Remover setor?" destructive onConfirm={() => remove(s.id)}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default Sectors;

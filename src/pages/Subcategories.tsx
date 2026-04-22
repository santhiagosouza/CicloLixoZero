import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Sub { id: string; name: string; active: boolean; category_id: string; }
interface Category { id: string; name: string; }

const Subcategories = () => {
  const { clientId, isClientAdmin } = useAuth();
  const [items, setItems] = useState<Sub[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      supabase.from("subcategories").select("*").eq("client_id", clientId).order("name"),
      supabase.from("categories").select("id, name").order("name"),
    ]).then(([s, c]) => {
      setItems((s.data ?? []) as Sub[]);
      setCats((c.data ?? []) as Category[]);
    });
  }, [clientId, reload]);

  const create = async () => {
    if (!name.trim() || !catId) return;
    const { error } = await supabase.from("subcategories").insert({ client_id: clientId!, name: name.trim(), category_id: catId });
    if (error) toast.error(error.message);
    else { toast.success("Subcategoria criada"); setName(""); setCatId(""); setOpen(false); setReload((k) => k + 1); }
  };

  const toggle = async (s: Sub) => {
    const { error } = await supabase.from("subcategories").update({ active: !s.active }).eq("id", s.id);
    if (error) toast.error(error.message); else setReload((k) => k + 1);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); setReload((k) => k + 1); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subcategorias</h1>
          <p className="text-sm text-muted-foreground">Tipos específicos de resíduos da sua operação</p>
        </div>
        {isClientAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova subcategoria</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova subcategoria</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={catId} onValueChange={setCatId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Ativo</TableHead><TableHead className="w-16" />
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhuma subcategoria</TableCell></TableRow>}
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{cats.find((c) => c.id === s.category_id)?.name ?? "—"}</TableCell>
                <TableCell><Switch checked={s.active} onCheckedChange={() => toggle(s)} disabled={!isClientAdmin} /></TableCell>
                <TableCell>
                  {isClientAdmin && (
                    <ConfirmDialog trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                      title="Remover?" destructive onConfirm={() => remove(s.id)} />
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

export default Subcategories;

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Sub { id: string; name: string; active: boolean; category_id: string; }
interface Category { id: string; name: string; color: string | null; }

const CATEGORY_ORDER = ["Orgânico", "Reciclável", "Perigoso", "Rejeito"];

const Subcategories = () => {
  const { clientId, isClientAdmin } = useAuth();
  const [items, setItems] = useState<Sub[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [reload, setReload] = useState(0);

  // create dialog
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [catId, setCatId] = useState("");

  // edit dialog
  const [editing, setEditing] = useState<Sub | null>(null);
  const [editName, setEditName] = useState("");
  const [editCatId, setEditCatId] = useState("");

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      supabase.from("subcategories").select("*").eq("client_id", clientId).order("name"),
      supabase.from("categories").select("id, name, color").order("name"),
    ]).then(([s, c]) => {
      setItems((s.data ?? []) as Sub[]);
      setCats((c.data ?? []) as Category[]);
    });
  }, [clientId, reload]);

  const orderedCats = useMemo(() => {
    return [...cats].sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a.name);
      const ib = CATEGORY_ORDER.indexOf(b.name);
      if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [cats]);

  const create = async () => {
    if (!name.trim() || !catId) return;
    const { error } = await supabase.from("subcategories").insert({ client_id: clientId!, name: name.trim(), category_id: catId });
    if (error) toast.error(error.message);
    else { toast.success("Categoria criada"); setName(""); setCatId(""); setOpen(false); setReload((k) => k + 1); }
  };

  const saveEdit = async () => {
    if (!editing || !editName.trim() || !editCatId) return;
    const { error } = await supabase.from("subcategories").update({ name: editName.trim(), category_id: editCatId }).eq("id", editing.id);
    if (error) toast.error(error.message);
    else { toast.success("Atualizada"); setEditing(null); setReload((k) => k + 1); }
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

  const openEdit = (s: Sub) => {
    setEditing(s);
    setEditName(s.name);
    setEditCatId(s.category_id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Tipos específicos de resíduos da sua operação, agrupados por categoria principal</p>
        </div>
        {isClientAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova categoria</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Categoria principal</Label>
                  <Select value={catId} onValueChange={setCatId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{orderedCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {orderedCats.map((cat) => {
          const subs = items
            .filter((i) => i.category_id === cat.id)
            .sort((a, b) => a.name.localeCompare(b.name));
          return (
            <Card key={cat.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="inline-block h-3 w-3 rounded-full border"
                    style={{ backgroundColor: cat.color ?? "transparent" }}
                  />
                  {cat.name}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {subs.length} {subs.length === 1 ? "item" : "itens"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {subs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria cadastrada</p>
                ) : (
                  <ul className="divide-y">
                    {subs.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-2 gap-2">
                        <span className={`text-sm ${s.active ? "" : "text-muted-foreground line-through"}`}>
                          {s.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={s.active}
                            onCheckedChange={() => toggle(s)}
                            disabled={!isClientAdmin}
                          />
                          {isClientAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <ConfirmDialog
                                trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>}
                                title="Remover categoria?"
                                destructive
                                onConfirm={() => remove(s.id)}
                              />
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Categoria principal</Label>
              <Select value={editCatId} onValueChange={setEditCatId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{orderedCats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subcategories;

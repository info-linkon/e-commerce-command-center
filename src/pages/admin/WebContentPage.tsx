import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2, Save, Loader2, ImagePlus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSiteContent, useUpsertSiteContent } from '@/hooks/useSiteContent';
import { defaultContent, sectionLabels, pageLabels, sectionFields, FieldConfig } from '@/lib/web-default-content';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const pages = ['home', 'about', 'contact', 'settings'];

export default function WebContentPage() {
  const { data: allContent = [], isLoading } = useSiteContent();
  const upsert = useUpsertSiteContent();
  const [editDialog, setEditDialog] = useState<{ page: string; section: string } | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const getContent = (page: string, section: string) => {
    const row = allContent.find((r) => r.page === page && r.section === section);
    return (row?.content as Record<string, any>) || defaultContent[page]?.[section] || {};
  };

  const openEdit = (page: string, section: string) => {
    setEditData(JSON.parse(JSON.stringify(getContent(page, section))));
    setEditDialog({ page, section });
  };

  const handleSave = () => {
    if (!editDialog) return;
    upsert.mutate(
      { page: editDialog.page, section: editDialog.section, content: editData },
      { onSuccess: () => setEditDialog(null) }
    );
  };

  const updateField = (key: string, value: any) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const updateArrayItem = (arrayKey: string, index: number, fieldKey: string, value: any) => {
    setEditData((prev) => {
      const arr = [...(prev[arrayKey] || [])];
      if (fieldKey === '_value') {
        arr[index] = value;
      } else {
        arr[index] = { ...arr[index], [fieldKey]: value };
      }
      return { ...prev, [arrayKey]: arr };
    });
  };

  const addArrayItem = (arrayKey: string, fields: FieldConfig[]) => {
    setEditData((prev) => {
      const arr = [...(prev[arrayKey] || [])];
      if (fields.length === 1 && fields[0].key === '_value') {
        arr.push('');
      } else {
        const newItem: Record<string, any> = {};
        fields.forEach((f) => { newItem[f.key] = ''; });
        arr.push(newItem);
      }
      return { ...prev, [arrayKey]: arr };
    });
  };

  const removeArrayItem = (arrayKey: string, index: number) => {
    setEditData((prev) => {
      const arr = [...(prev[arrayKey] || [])];
      arr.splice(index, 1);
      return { ...prev, [arrayKey]: arr };
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `content/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: false });
    if (error) {
      toast.error('שגיאה בהעלאת התמונה');
      return null;
    }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleImageUpload = async (key: string, file: File) => {
    const url = await uploadImage(file);
    if (url) updateField(key, url);
  };

  const handleArrayImageUpload = async (arrayKey: string, index: number, fieldKey: string, file: File) => {
    const url = await uploadImage(file);
    if (url) updateArrayItem(arrayKey, index, fieldKey, url);
  };

  const renderField = (field: FieldConfig) => {
    if (field.type === 'text') {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Input
            value={editData[field.key] || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
          />
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <Textarea
            value={editData[field.key] || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      );
    }
    if (field.type === 'image') {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <div className="flex items-center gap-3">
            {editData[field.key] && (
              <img src={editData[field.key]} alt="" className="w-20 h-20 object-cover rounded-lg border border-border" />
            )}
            <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ImagePlus className="w-4 h-4" />
              <span>העלה תמונה</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(field.key, f);
              }} />
            </label>
          </div>
          <Input
            value={editData[field.key] || ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder="או הדבק כתובת URL"
            className="mt-1"
            dir="ltr"
          />
        </div>
      );
    }
    if (field.type === 'array' && field.arrayFields) {
      const items = editData[field.key] || [];
      return (
        <div key={field.key} className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-bold">{field.label}</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem(field.key, field.arrayFields!)}>
              <Plus className="w-3 h-3 ml-1" />
              הוסף
            </Button>
          </div>
          {items.map((item: any, i: number) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30 relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1 left-1 h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => removeArrayItem(field.key, i)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
               {field.arrayFields!.map((af) => (
                <div key={af.key} className="space-y-1">
                  <Label className="text-xs">{af.label}</Label>
                  {af.type === 'image' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {(af.key === '_value' ? item : item?.[af.key]) && (
                          <img src={af.key === '_value' ? item : item?.[af.key]} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        )}
                        <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ImagePlus className="w-4 h-4" />
                          <span>{(af.key === '_value' ? item : item?.[af.key]) ? 'החלף תמונה' : 'העלה תמונה'}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleArrayImageUpload(field.key, i, af.key, f);
                          }} />
                        </label>
                      </div>
                      {!(af.key === '_value' ? item : item?.[af.key]) && (
                        <p className="text-xs text-muted-foreground/60">תמונת ברירת מחדל תוצג באתר אם לא תועלה תמונה</p>
                      )}
                    </div>
                  ) : af.type === 'textarea' ? (
                    <Textarea
                      value={af.key === '_value' ? item : (item?.[af.key] || '')}
                      onChange={(e) => updateArrayItem(field.key, i, af.key, e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                  ) : (
                    <Input
                      value={af.key === '_value' ? item : (item?.[af.key] || '')}
                      onChange={(e) => updateArrayItem(field.key, i, af.key, e.target.value)}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }
    if (field.type === 'color') {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label>{field.label}</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={editData[field.key] || '#000000'}
              onChange={(e) => updateField(field.key, e.target.value)}
              className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
            />
            <Input
              value={editData[field.key] || ''}
              onChange={(e) => updateField(field.key, e.target.value)}
              placeholder="#000000"
              dir="ltr"
              className="flex-1 font-mono text-sm"
            />
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">תוכן האתר</h1>
        <p className="text-muted-foreground text-sm mt-1">עריכת תוכן סטטי בדפי האתר</p>
      </div>

      <Tabs defaultValue="home" dir="rtl">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
          {pages.map((page) => (
            <TabsTrigger key={page} value={page} className="text-sm">
              {pageLabels[page]}
            </TabsTrigger>
          ))}
        </TabsList>

        {pages.map((page) => (
          <TabsContent key={page} value={page} className="space-y-4 mt-4">
            {Object.keys(sectionLabels[page] || {}).map((section) => {
              const content = getContent(page, section);
              return (
                <Card key={section}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{sectionLabels[page][section]}</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => openEdit(page, section)}>
                        <Pencil className="w-3 h-3 ml-1" />
                        ערוך
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {Object.entries(content).slice(0, 5).map(([k, v]) => {
                        const fieldDef = sectionFields[page]?.[section]?.find((f) => f.key === k);
                        const isImage = fieldDef?.type === 'image';
                        if (isImage) {
                          return (
                            <div key={k} className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{fieldDef?.label || k}:</span>
                              {v && typeof v === 'string' ? (
                                <img src={v} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                              ) : (
                                <span className="text-xs text-muted-foreground/60">לא הוגדרה תמונה</span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <p key={k}>
                            <span className="font-medium text-foreground">{fieldDef?.label || k}:</span>{' '}
                            {typeof v === 'string' ? v.substring(0, 80) + (v.length > 80 ? '...' : '') : Array.isArray(v) ? `${v.length} פריטים` : JSON.stringify(v).substring(0, 60)}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              עריכת {editDialog ? sectionLabels[editDialog.page]?.[editDialog.section] : ''} — {editDialog ? pageLabels[editDialog.page] : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editDialog && sectionFields[editDialog.page]?.[editDialog.section]?.map(renderField)}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setEditDialog(null)}>ביטול</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
              שמור
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

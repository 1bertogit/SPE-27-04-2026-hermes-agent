import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  X,
  Save,
  Lock,
  FileWarning,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { usePatientStore } from '../stores/patientStore';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';
import { useUIStore } from '../stores/uiStore';
import type { Patient, PatientPhoto } from '../lib/types';

const VIEWPORTS = [
  { key: 'Frontal', label: 'Frontal', gridArea: 'frontal' },
  { key: 'Lateral_L', label: 'Lateral Esquerda', gridArea: 'latL' },
  { key: 'Lateral_R', label: 'Lateral Direita', gridArea: 'latR' },
  { key: 'Oblique_L', label: 'Obliqua Esquerda', gridArea: 'oblL' },
  { key: 'Oblique_R', label: 'Obliqua Direita', gridArea: 'oblR' },
] as const;

const DRAW_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#ffffff'];

interface DrawPoint { x: number; y: number }
interface DrawOp { type: 'pen' | 'eraser'; color: string; width: number; points: DrawPoint[] }

export default function Photos() {
  const { patients, fetchPatients } = usePatientStore();
  const orgId = useAuthStore((s) => s.orgId);
  const hasSignedAUI = useDocumentStore((s) => s.hasSignedAUI);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [auiSigned, setAuiSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [annotatingPhoto, setAnnotatingPhoto] = useState<PatientPhoto | null>(null);

  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawOps, setDrawOps] = useState<DrawOp[]>([]);
  const [undoStack, setUndoStack] = useState<DrawOp[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentOp = useRef<DrawOp | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const refreshSignedUrls = useCallback(async (photoList: PatientPhoto[]) => {
    const paths = photoList.map((p) => p.file_url).filter(Boolean);
    if (!paths.length) return;
    const { data, error } = await supabase.storage.from('patient-photos').createSignedUrls(paths, 3600);
    if (error || !data) {
      showToast('Erro ao carregar fotos. Tente recarregar.', 'error');
      return;
    }
    const map: Record<string, string> = {};
    data.forEach((item) => {
      if (item.signedUrl && item.path) {
        map[item.path] = item.signedUrl;
      }
    });
    setSignedUrls(map);
  }, [showToast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  useEffect(() => {
    if (selectedPatientId) {
      setLoading(true);
      Promise.all([
        supabase.from('patient_photos').select('*').eq('patient_id', selectedPatientId),
        hasSignedAUI(selectedPatientId),
      ]).then(async ([{ data }, signed]) => {
        const list = (data as PatientPhoto[]) ?? [];
        setPhotos(list);
        setAuiSigned(signed);
        await refreshSignedUrls(list);
        setLoading(false);
      });
    }
  }, [selectedPatientId, refreshSignedUrls, hasSignedAUI]);

  const handleUpload = async (viewport: string, file: File) => {
    if (!selectedPatientId || !orgId) return;
    const signed = await hasSignedAUI(selectedPatientId);
    if (!signed) {
      showToast('Upload bloqueado: Autorização de Uso de Imagem não assinada.', 'error');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      return;
    }
    const user = session.user;

    const fileExt = file.name.split('.').pop();
    const filePath = `${orgId}/${selectedPatientId}/${viewport}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('patient-photos')
      .upload(filePath, file);

    if (uploadError) {
      showToast('Erro ao enviar foto. Tente novamente.', 'error');
      return;
    }

    await supabase.from('patient_photos').insert({
      patient_id: selectedPatientId,
      user_id: user.id,
      org_id: orgId,
      viewport,
      file_url: filePath,
      annotations_json: [],
    });

    const { data, error: fetchError } = await supabase
      .from('patient_photos')
      .select('*')
      .eq('patient_id', selectedPatientId);
    if (!fetchError && data) {
      const newPhotos = data as PatientPhoto[];
      setPhotos(newPhotos);
      await refreshSignedUrls(newPhotos);
    }
    showToast('Foto enviada com sucesso', 'success');
  };

  const redrawAnnotation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    drawOps.forEach((op) => {
      if (op.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = op.type === 'eraser' ? '#000000' : op.color;
      ctx.lineWidth = op.type === 'eraser' ? 20 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = op.type === 'eraser' ? 'destination-out' : 'source-over';
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) ctx.lineTo(op.points[i].x, op.points[i].y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    });
  }, [drawOps]);

  useEffect(() => { redrawAnnotation(); }, [redrawAnnotation]);

  useEffect(() => {
    if (!annotatingPhoto) return;
    let cancelled = false;

    const tryInit = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        if (!cancelled) requestAnimationFrame(tryInit);
        return;
      }
      const url = signedUrls[annotatingPhoto.file_url];
      if (!url) {
        showToast('Foto indisponível. Recarregue a página.', 'error');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        imgRef.current = img;
        canvas.width = img.width > 800 ? 800 : img.width;
        canvas.height = (canvas.width / img.width) * img.height;
        redrawAnnotation();
      };
      img.src = url;
    };

    requestAnimationFrame(tryInit);
    return () => { cancelled = true; };
  }, [annotatingPhoto, redrawAnnotation, signedUrls, showToast]);

  const openAnnotation = async (photo: PatientPhoto) => {
    await refreshSignedUrls(photos);
    setAnnotatingPhoto(photo);
    setDrawOps((photo.annotations_json as unknown as DrawOp[]) ?? []);
    setUndoStack([]);
  };

  const getPoint = (e: React.MouseEvent<HTMLCanvasElement>): DrawPoint => {
    const r = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / r.width;
    const scaleY = canvasRef.current!.height / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
  };

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    currentOp.current = { type: tool, color: drawColor, width: 3, points: [getPoint(e)] };
  };
  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentOp.current) return;
    currentOp.current.points.push(getPoint(e));
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pts = currentOp.current.points;
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#000' : drawColor;
    ctx.lineWidth = tool === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };
  const onUp = () => {
    if (currentOp.current && currentOp.current.points.length > 1) {
      setDrawOps((p) => [...p, currentOp.current!]);
      setUndoStack([]);
    }
    currentOp.current = null;
    setIsDrawing(false);
  };

  const saveAnnotations = async () => {
    if (!annotatingPhoto) return;
    const { error } = await supabase
      .from('patient_photos')
      .update({ annotations_json: drawOps as unknown as PatientPhoto['annotations_json'] })
      .eq('id', annotatingPhoto.id);
    if (error) {
      showToast('Erro ao salvar anotações. Tente novamente.', 'error');
      return;
    }
    showToast('Anotações salvas', 'success');
    setAnnotatingPhoto(null);
  };

  const getPhotoForViewport = (vp: string) => photos.find((p) => p.viewport === vp);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">Fotos</h1>
          <p className="text-sm text-editorial-muted mt-1">Gerenciamento de fotos dos pacientes</p>
        </div>
      </div>

      <Card>
        <div className="max-w-xs">
          <Select
            label="Selecione o Paciente"
            placeholder="Escolha um paciente"
            options={patients.map((p: Patient) => ({ label: p.full_name, value: p.id }))}
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
          />
        </div>
      </Card>

      {!selectedPatientId ? (
        <EmptyState
          icon={<Camera className="h-12 w-12" />}
          title="Selecione um paciente"
          description="Escolha um paciente para visualizar e gerenciar fotos"
        />
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-editorial-cream animate-pulse dark:bg-editorial-navy-light/30" />
          ))}
        </div>
      ) : (
        <>
          {!auiSigned && (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-editorial-rose/30 bg-editorial-rose/5 dark:border-editorial-rose/20 dark:bg-editorial-rose/10">
              <FileWarning className="h-5 w-5 text-editorial-rose shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-editorial-navy dark:text-editorial-cream">
                  Autorização de Uso de Imagem necessária
                </p>
                <p className="text-xs text-editorial-muted mt-1">
                  Para enviar fotos deste paciente, é necessário que a Autorização de Uso de Imagem
                  esteja assinada. Acesse a aba Documentos do paciente para criar e assinar o documento.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {VIEWPORTS.map((vp) => {
              const photo = getPhotoForViewport(vp.key);
              return (
                <div key={vp.key} className="space-y-2">
                  <p className="text-xs font-medium text-editorial-muted uppercase tracking-wider text-center">
                    {vp.label}
                  </p>
                  {photo ? (
                    <div
                      className="relative aspect-[3/4] rounded-lg overflow-hidden border border-editorial-cream dark:border-editorial-navy-light/20 group cursor-pointer"
                      onClick={() => openAnnotation(photo)}
                    >
                      <img
                        src={signedUrls[photo.file_url] ?? ''}
                        alt={vp.label}
                        className="w-full h-full object-cover"
                        onError={() => refreshSignedUrls(photos)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Pen className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  ) : auiSigned ? (
                    <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-lg border-2 border-dashed border-editorial-gold hover:border-editorial-gold-light cursor-pointer transition-colors bg-editorial-light/50 dark:bg-editorial-navy/30">
                      <Upload className="h-8 w-8 text-editorial-warm mb-2" />
                      <span className="text-xs text-editorial-muted">Arraste ou clique</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(vp.key, file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex flex-col items-center justify-center aspect-[3/4] rounded-lg border-2 border-dashed border-editorial-cream dark:border-editorial-navy-light/30 bg-editorial-light/30 dark:bg-editorial-navy/20">
                      <Lock className="h-6 w-6 text-editorial-warm/50 mb-2" />
                      <span className="text-xs text-editorial-muted/60">AUI pendente</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={!!annotatingPhoto}
        onOpenChange={() => setAnnotatingPhoto(null)}
        title="Anotar Foto"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant={tool === 'pen' ? 'primary' : 'ghost'} size="sm" onClick={() => setTool('pen')}>
                <Pen className="h-3.5 w-3.5" />
              </Button>
              <Button variant={tool === 'eraser' ? 'primary' : 'ghost'} size="sm" onClick={() => setTool('eraser')}>
                <Eraser className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-6 bg-editorial-cream dark:bg-editorial-navy-light/30 mx-1" />
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setDrawColor(c); setTool('pen'); }}
                  className={`w-5 h-5 rounded-full border-2 ${drawColor === c && tool === 'pen' ? 'border-editorial-navy' : 'border-editorial-warm'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="w-px h-6 bg-editorial-cream dark:bg-editorial-navy-light/30 mx-1" />
              <Button variant="ghost" size="sm" onClick={() => { if (drawOps.length) { setUndoStack((u) => [...u, drawOps[drawOps.length - 1]]); setDrawOps((o) => o.slice(0, -1)); } }}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { if (undoStack.length) { setDrawOps((o) => [...o, undoStack[undoStack.length - 1]]); setUndoStack((u) => u.slice(0, -1)); } }}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setDrawOps([]); setUndoStack([]); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAnnotatingPhoto(null)}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={saveAnnotations}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
            </div>
          </div>
          <div className="bg-editorial-paper dark:bg-editorial-navy-dark rounded-lg overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              className="block w-full"
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

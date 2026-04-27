import { useRef, useState, useEffect, useCallback } from 'react';
import { Pen, Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface Point {
  x: number;
  y: number;
}

interface DrawOp {
  type: 'pen' | 'eraser';
  color: string;
  width: number;
  points: Point[];
}

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'];
const LINE_WIDTHS = [2, 4, 6];

export function AnatomicalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(LINE_WIDTHS[1]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [operations, setOperations] = useState<DrawOp[]>([]);
  const [undoStack, setUndoStack] = useState<DrawOp[]>([]);
  const currentOp = useRef<DrawOp | null>(null);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBodyOutline(ctx, canvas.width, canvas.height);

    operations.forEach((op) => {
      if (op.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = op.type === 'eraser' ? '#FAF9F7' : op.color;
      ctx.lineWidth = op.type === 'eraser' ? op.width * 3 : op.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(op.points[0].x, op.points[0].y);
      for (let i = 1; i < op.points.length; i++) {
        ctx.lineTo(op.points[i].x, op.points[i].y);
      }
      ctx.stroke();
    });
  }, [operations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = 420;
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const point = getCanvasPoint(e);
    currentOp.current = { type: tool, color, width: lineWidth, points: [point] };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentOp.current) return;
    const point = getCanvasPoint(e);
    currentOp.current.points.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pts = currentOp.current.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#FAF9F7' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    if (currentOp.current && currentOp.current.points.length > 1) {
      setOperations((prev) => [...prev, currentOp.current!]);
      setUndoStack([]);
    }
    currentOp.current = null;
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (operations.length === 0) return;
    const last = operations[operations.length - 1];
    setOperations((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, last]);
  };

  const handleRedo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setOperations((prev) => [...prev, last]);
  };

  const handleClear = () => {
    setOperations([]);
    setUndoStack([]);
    redrawCanvas();
  };

  useEffect(() => {
    redrawCanvas();
  }, [operations, redrawCanvas]);

  return (
    <div className="bg-editorial-light dark:bg-editorial-navy/60 border border-editorial-cream dark:border-editorial-navy-light/20 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-editorial-cream dark:border-editorial-navy-light/20 bg-editorial-light-hover">
        <div className="flex items-center gap-2">
          <Button
            variant={tool === 'pen' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTool('pen')}
          >
            <Pen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={tool === 'eraser' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTool('eraser')}
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-6 bg-editorial-cream dark:bg-editorial-navy-light/30 mx-1" />

          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                color === c && tool === 'pen' ? 'border-editorial-navy scale-110' : 'border-editorial-warm'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="w-px h-6 bg-editorial-cream dark:bg-editorial-navy-light/30 mx-1" />

          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                lineWidth === w ? 'bg-editorial-cream dark:bg-editorial-navy-light/30' : 'hover:bg-editorial-cream/40 dark:hover:bg-white/5'
              }`}
            >
              <div className="rounded-full bg-editorial-navy-light" style={{ width: w * 2, height: w * 2 }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={operations.length === 0}>
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={undoStack.length === 0}>
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="bg-editorial-paper dark:bg-editorial-navy-dark cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="block w-full"
        />
      </div>
    </div>
  );
}

function drawBodyOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#D4CFC5';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const cx = w / 2;
  const startY = 30;

  ctx.beginPath();
  ctx.ellipse(cx, startY + 25, 18, 25, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 8, startY + 50);
  ctx.lineTo(cx - 15, startY + 55);
  ctx.lineTo(cx - 30, startY + 65);
  ctx.moveTo(cx - 15, startY + 55);
  ctx.lineTo(cx - 22, startY + 100);
  ctx.lineTo(cx - 30, startY + 180);
  ctx.lineTo(cx - 18, startY + 180);
  ctx.lineTo(cx - 10, startY + 115);
  ctx.lineTo(cx, startY + 100);
  ctx.lineTo(cx + 10, startY + 115);
  ctx.lineTo(cx + 18, startY + 180);
  ctx.lineTo(cx + 30, startY + 180);
  ctx.lineTo(cx + 22, startY + 100);
  ctx.lineTo(cx + 15, startY + 55);
  ctx.lineTo(cx + 30, startY + 65);
  ctx.moveTo(cx + 15, startY + 55);
  ctx.lineTo(cx + 8, startY + 50);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 30, startY + 65);
  ctx.lineTo(cx - 55, startY + 120);
  ctx.lineTo(cx - 60, startY + 145);
  ctx.moveTo(cx + 30, startY + 65);
  ctx.lineTo(cx + 55, startY + 120);
  ctx.lineTo(cx + 60, startY + 145);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 18, startY + 180);
  ctx.lineTo(cx - 20, startY + 260);
  ctx.lineTo(cx - 22, startY + 340);
  ctx.lineTo(cx - 28, startY + 350);
  ctx.moveTo(cx + 18, startY + 180);
  ctx.lineTo(cx + 20, startY + 260);
  ctx.lineTo(cx + 22, startY + 340);
  ctx.lineTo(cx + 28, startY + 350);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.fillStyle = '#8A8477';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Marque as areas de interesse', cx, h - 10);
}

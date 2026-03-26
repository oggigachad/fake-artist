"use client";

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Stroke } from "@/types";
import { drawStroke, resizeCanvas, clearCanvas, downloadCanvas } from "@/lib/canvas-utils";
import { Undo2, Redo2, Eraser, Paintbrush, Download, Minus, Plus } from "lucide-react";

interface CanvasBoardProps {
    roomId: string;
    isMyTurn: boolean;
    color: string;
    brushStyle?: { type: string, color?: string };
    brushSize?: number;
    opacity?: number;
    tool?: 'brush' | 'eraser';
    onBrushSizeChange?: (size: number) => void;
    onOpacityChange?: (opacity: number) => void;
    onToolChange?: (tool: 'brush' | 'eraser') => void;
}

export interface CanvasBoardHandle {
    getCanvas: () => HTMLCanvasElement | null;
}

const EMIT_THROTTLE_MS = 16; // ~60fps socket emit throttle

const CanvasBoard = forwardRef<CanvasBoardHandle, CanvasBoardProps>(function CanvasBoard(
    { roomId, isMyTurn, color, brushStyle, brushSize = 4, opacity = 1, tool = 'brush', onBrushSizeChange, onOpacityChange, onToolChange },
    ref
) {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);
    const strokeHistoryRef = useRef<Stroke[]>([]);
    const undoStackRef = useRef<Stroke[]>([]);

    // Optimization refs
    const pendingStrokesRef = useRef<Stroke[]>([]);
    const rafIdRef = useRef<number | null>(null);
    const lastEmitTimeRef = useRef<number>(0);
    const emitBufferRef = useRef<Stroke[]>([]);

    useImperativeHandle(ref, () => ({
        getCanvas: () => canvasRef.current
    }));

    // Preserve canvas content on resize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeDisplay = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            // Save current canvas content
            const imageData = canvas.width > 0 && canvas.height > 0
                ? canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height)
                : null;
            const oldWidth = canvas.width;
            const oldHeight = canvas.height;

            // Resize
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Fill white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Restore previous content if dimensions match or redraw from history
            if (imageData && oldWidth === canvas.width && oldHeight === canvas.height) {
                ctx.putImageData(imageData, 0, 0);
            } else if (strokeHistoryRef.current.length > 0) {
                // Redraw all strokes on resize
                strokeHistoryRef.current.forEach(stroke => {
                    drawStroke({
                        ctx,
                        start: { x: stroke.prevX, y: stroke.prevY },
                        end: { x: stroke.x, y: stroke.y },
                        color: stroke.color,
                        brushType: stroke.brushType,
                        brushSize: stroke.brushSize,
                        opacity: stroke.opacity,
                        tool: stroke.tool
                    });
                });
            }
        };

        resizeDisplay();
        window.addEventListener("resize", resizeDisplay);

        return () => {
            window.removeEventListener("resize", resizeDisplay);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    // Redraw all strokes from history
    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        strokeHistoryRef.current.forEach(stroke => {
            drawStroke({
                ctx,
                start: { x: stroke.prevX, y: stroke.prevY },
                end: { x: stroke.x, y: stroke.y },
                color: stroke.color,
                brushType: stroke.brushType,
                brushSize: stroke.brushSize,
                opacity: stroke.opacity,
                tool: stroke.tool
            });
        });
    }, []);

    const handleUndo = useCallback(() => {
        if (!isMyTurn || strokeHistoryRef.current.length === 0) return;
        const lastStroke = strokeHistoryRef.current.pop()!;
        undoStackRef.current.push(lastStroke);
        redrawAll();
        socket.emit('undo', roomId);
    }, [isMyTurn, redrawAll, socket, roomId]);

    const handleRedo = useCallback(() => {
        if (!isMyTurn || undoStackRef.current.length === 0) return;
        const stroke = undoStackRef.current.pop()!;
        strokeHistoryRef.current.push(stroke);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) {
            drawStroke({
                ctx,
                start: { x: stroke.prevX, y: stroke.prevY },
                end: { x: stroke.x, y: stroke.y },
                color: stroke.color,
                brushType: stroke.brushType,
                brushSize: stroke.brushSize,
                opacity: stroke.opacity,
                tool: stroke.tool
            });
        }
        socket.emit('redo', roomId);
    }, [isMyTurn, socket, roomId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isMyTurn) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                handleRedo();
            }
            if (e.key === 'e' && !e.ctrlKey && !e.metaKey) {
                onToolChange?.(tool === 'eraser' ? 'brush' : 'eraser');
            }
            if (e.key === '[') {
                onBrushSizeChange?.(Math.max(1, brushSize - 2));
            }
            if (e.key === ']') {
                onBrushSizeChange?.(Math.min(30, brushSize + 2));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMyTurn, handleUndo, handleRedo, tool, brushSize, onToolChange, onBrushSizeChange]);

    const getPos = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        // Scale coordinates to canvas internal resolution
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    // Flush pending strokes via requestAnimationFrame
    const flushPendingStrokes = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || pendingStrokesRef.current.length === 0) {
            rafIdRef.current = null;
            return;
        }

        const strokes = pendingStrokesRef.current.splice(0);
        strokes.forEach(stroke => {
            drawStroke({
                ctx,
                start: { x: stroke.prevX, y: stroke.prevY },
                end: { x: stroke.x, y: stroke.y },
                color: stroke.color,
                brushType: stroke.brushType,
                brushSize: stroke.brushSize,
                opacity: stroke.opacity,
                tool: stroke.tool,
            });
        });
        rafIdRef.current = null;
    }, []);

    // Throttled socket emit
    const emitStroke = useCallback((stroke: Stroke) => {
        const now = Date.now();
        if (now - lastEmitTimeRef.current >= EMIT_THROTTLE_MS) {
            // Flush any buffered strokes
            if (emitBufferRef.current.length > 0) {
                emitBufferRef.current.forEach(s => socket.emit("draw_stroke", roomId, s));
                emitBufferRef.current = [];
            }
            socket.emit("draw_stroke", roomId, stroke);
            lastEmitTimeRef.current = now;
        } else {
            emitBufferRef.current.push(stroke);
        }
    }, [socket, roomId]);

    const startDrawing = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
        if (!isMyTurn) return;
        e.preventDefault();
        setIsDrawing(true);
        lastPos.current = getPos(e);
        // Clear redo stack on new drawing action
        undoStackRef.current = [];
    };

    const draw = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !isMyTurn || !lastPos.current) return;
        e.preventDefault();

        const currentPos = getPos(e);

        let effectiveColor = color;
        if (brushStyle?.color) {
            if (brushStyle.color === 'galaxy') effectiveColor = '#663399';
            else if (brushStyle.color === 'plasma') effectiveColor = '#DB00FF';
            else effectiveColor = brushStyle.color;
        }

        const strokeData: Stroke = {
            x: currentPos.x,
            y: currentPos.y,
            prevX: lastPos.current.x,
            prevY: lastPos.current.y,
            color: effectiveColor,
            brushType: brushStyle?.type,
            brushSize,
            opacity,
            tool,
        };

        // Queue stroke for RAF rendering
        pendingStrokesRef.current.push(strokeData);
        if (rafIdRef.current === null) {
            rafIdRef.current = requestAnimationFrame(flushPendingStrokes);
        }

        strokeHistoryRef.current.push(strokeData);
        emitStroke(strokeData);
        lastPos.current = currentPos;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        lastPos.current = null;
        // Flush any remaining buffered socket emissions
        if (emitBufferRef.current.length > 0) {
            emitBufferRef.current.forEach(s => socket.emit("draw_stroke", roomId, s));
            emitBufferRef.current = [];
        }
        // Flush any pending RAF strokes
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
            flushPendingStrokes();
        }
    };

    const getCursor = () => {
        if (!isMyTurn) return 'not-allowed';
        if (tool === 'eraser') return 'cell';
        return 'crosshair';
    };

    return (
        <div className="w-full h-full bg-white rounded-xl shadow-2xl overflow-hidden relative">
            <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                onPointerCancel={stopDrawing}
                className="block w-full h-full touch-none"
                style={{ cursor: getCursor() }}
            />

            {/* Drawing tools overlay */}
            {isMyTurn && (
                <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 bg-black/60 backdrop-blur-md rounded-full px-2 sm:px-4 py-1.5 sm:py-2 z-10 border border-white/10 max-w-[95vw] overflow-x-auto color-scroll">
                    {/* Tool toggle */}
                    <button
                        onClick={() => onToolChange?.(tool === 'brush' ? 'eraser' : 'brush')}
                        className={`p-2 rounded-full transition-all touch-target ${tool === 'eraser' ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        title={tool === 'eraser' ? 'Switch to Brush (E)' : 'Switch to Eraser (E)'}
                    >
                        {tool === 'eraser' ? <Eraser className="w-4 h-4" /> : <Paintbrush className="w-4 h-4" />}
                    </button>

                    {/* Brush size */}
                    <div className="flex items-center gap-1 px-1 sm:px-2 border-l border-white/20">
                        <button onClick={() => onBrushSizeChange?.(Math.max(1, brushSize - 2))} className="p-1 text-white/60 hover:text-white touch-target">
                            <Minus className="w-3 h-3" />
                        </button>
                        <div className="w-6 sm:w-8 text-center text-xs text-white/80 font-mono">{brushSize}</div>
                        <button onClick={() => onBrushSizeChange?.(Math.min(30, brushSize + 2))} className="p-1 text-white/60 hover:text-white touch-target">
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>

                    {/* Opacity - hidden on very small screens */}
                    <div className="hidden sm:flex items-center gap-1 px-2 border-l border-white/20">
                        <span className="text-[10px] text-white/50 uppercase">Op</span>
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.1"
                            value={opacity}
                            onChange={(e) => onOpacityChange?.(parseFloat(e.target.value))}
                            className="w-16 h-1 accent-purple-500"
                        />
                        <span className="text-xs text-white/60 w-7 font-mono">{Math.round(opacity * 100)}%</span>
                    </div>

                    {/* Undo / Redo */}
                    <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 border-l border-white/20">
                        <button onClick={handleUndo} className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition touch-target" title="Undo (Ctrl+Z)">
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button onClick={handleRedo} className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition touch-target" title="Redo (Ctrl+Y)">
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Screenshot - hidden on mobile */}
                    <button
                        onClick={() => { const c = canvasRef.current; if (c) downloadCanvas(c); }}
                        className="p-2 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition pl-1 sm:pl-2 border-l border-white/20 hidden sm:block"
                        title="Save Drawing"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
});

export default CanvasBoard;

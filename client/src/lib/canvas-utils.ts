/**
 * Shared canvas drawing utilities to ensure consistent rendering
 * between drawer and guesser views
 */

export interface DrawStrokeParams {
    ctx: CanvasRenderingContext2D;
    start: { x: number; y: number };
    end: { x: number; y: number };
    color: string;
    brushType?: string;
    brushSize?: number;
    opacity?: number;
    tool?: 'brush' | 'eraser';
}

/**
 * Draw a stroke on the canvas with the specified style
 * This function ensures consistent rendering across all clients
 */
export function drawStroke({ ctx, start, end, color, brushType = 'normal', brushSize = 4, opacity = 1, tool = 'brush' }: DrawStrokeParams) {
    ctx.save();
    ctx.beginPath();
    const path = new Path2D();
    path.moveTo(start.x, start.y);
    path.lineTo(end.x, end.y);

    // Eraser tool
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = brushSize * 3; // Eraser is bigger
        ctx.lineCap = 'round';
        ctx.stroke(path);
        ctx.restore();
        return;
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Apply brush style effects
    if (brushType === 'neon') {
        ctx.shadowBlur = 10 + brushSize;
        ctx.shadowColor = color;
        ctx.lineWidth = brushSize + 2;
    } else if (brushType === 'pixel') {
        ctx.lineCap = 'square';
        ctx.setLineDash([brushSize, brushSize]);
    } else if (brushType === 'fire') {
        ctx.shadowBlur = 15 + brushSize;
        ctx.shadowColor = 'orange';
        ctx.lineWidth = brushSize + 1;
    } else if (brushType === 'calligraphy') {
        ctx.lineWidth = brushSize * 0.5;
        ctx.lineCap = 'butt';
    } else if (brushType === 'spray') {
        // Spray paint effect: multiple tiny dots around the line
        ctx.lineCap = 'round';
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dots = Math.max(5, Math.floor(dist * 2));
        ctx.fillStyle = color;
        for (let i = 0; i < dots; i++) {
            const t = Math.random();
            const px = start.x + dx * t + (Math.random() - 0.5) * brushSize * 3;
            const py = start.y + dy * t + (Math.random() - 0.5) * brushSize * 3;
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        return;
    } else {
        ctx.setLineDash([]);
    }

    ctx.stroke(path);
    
    // Reset effects
    ctx.restore();
}

/**
 * Clear and prepare a canvas
 */
export function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Resize canvas to match parent dimensions
 */
export function resizeCanvas(canvas: HTMLCanvasElement) {
    const parent = canvas.parentElement;
    if (!parent) return;
    
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}

/**
 * Export canvas as PNG data URL for screenshot sharing
 */
export function canvasToImage(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
}

/**
 * Download canvas as PNG file
 */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string = 'drawing.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasToImage(canvas);
    link.click();
}

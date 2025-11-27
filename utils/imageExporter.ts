import { SESAR_LOGO_STRING } from '../components/SesarLogo';

// Helper to download blob without external dependencies
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to serialize SVG and render to canvas for high-res export
export const exportSvgToPng = async (
  svgElement: SVGSVGElement,
  contentBounds: { minX: number; maxX: number; minY: number; maxY: number },
  filename: string,
  padding: number = 50
) => {
  try {
    // 1. Clone the SVG to manipulate it without affecting the UI
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // 2. Calculate dimensions
    const width = contentBounds.maxX - contentBounds.minX + (padding * 2);
    const height = contentBounds.maxY - contentBounds.minY + (padding * 2);
    
    // 3. Set the viewBox to exactly match the content's coordinate space
    const viewBoxX = contentBounds.minX - padding;
    const viewBoxY = contentBounds.minY - padding;
    
    clonedSvg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
    clonedSvg.setAttribute('width', `${width}px`);
    clonedSvg.setAttribute('height', `${height}px`);
    
    // Reset any transforms on the root group (g) if it exists, as viewBox handles the positioning now
    const rootG = clonedSvg.querySelector('g');
    if (rootG) {
        rootG.setAttribute('transform', ''); 
    }

    // 4. Serialize to XML
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    
    // 5. Create Blob and Image for the content
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    
    // 6. Create Image for Watermark
    const watermarkBlob = new Blob([SESAR_LOGO_STRING], { type: 'image/svg+xml;charset=utf-8' });
    const watermarkUrl = URL.createObjectURL(watermarkBlob);
    const watermarkImg = new Image();

    // Load watermark first
    await new Promise((resolve, reject) => {
        watermarkImg.onload = resolve;
        watermarkImg.onerror = reject;
        watermarkImg.src = watermarkUrl;
    });

    // 7. Wait for main image load and draw to Canvas
    await new Promise((resolve, reject) => {
      img.onload = () => {
        // Create high-res canvas (2x upscale for retina-like quality)
        const scale = 2; 
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw main image
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        // Draw Watermark (Bottom Right)
        const wmWidth = 200; // Desired width of logo on canvas
        const wmHeight = (100/300) * wmWidth; // Maintain aspect ratio 300:100
        const wmPadding = 20;
        
        ctx.globalAlpha = 0.8;
        ctx.drawImage(
            watermarkImg, 
            width - wmWidth - wmPadding, 
            height - wmHeight - wmPadding, 
            wmWidth, 
            wmHeight
        );
        ctx.globalAlpha = 1.0;
        
        // Export
        canvas.toBlob((blob) => {
            if (blob) {
                downloadBlob(blob, filename);
                resolve(null);
            } else {
                reject(new Error('Canvas to Blob failed'));
            }
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(watermarkUrl);
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = url;
    });

  } catch (error) {
    console.error('Export failed:', error);
    alert('Failed to generate image. Please try again.');
  }
};
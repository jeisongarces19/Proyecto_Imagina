import { useEffect, useRef } from 'react';

export default function DWGOverlay2D({
  canvasRef,
  viewRef, // mismo viewRef del Plan2D
  src, // /assets/plans/autonoma-1.svg
  opacity = 0.35,
  scale = 1, // escala base
  offset = { x: 0, z: 0 }, // mover plano
  visible = true,
}) {
  const imgRef = useRef(null);

  // cargar SVG como imagen
  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.src = src;
  }, [src]);

  // dibujar sobre el canvas 2D
  useEffect(() => {
    if (!visible) return;

    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { cx, cz, s } = viewRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.save();
      ctx.globalAlpha = opacity;

      // origen world → canvas
      const px = (offset.x - cx) * s + w / 2;
      const py = -(offset.z - cz) * s + h / 2;

      const drawW = img.width * s * scale;
      const drawH = img.height * s * scale;

      ctx.drawImage(img, px, py, drawW, drawH);

      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef, viewRef, opacity, scale, offset, visible]);

  return null;
}

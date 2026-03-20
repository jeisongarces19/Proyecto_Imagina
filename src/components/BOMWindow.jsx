import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function BOMWindow({
  open,
  title = 'Inventario BOM',
  onClose,
  children,
  features = 'width=720,height=520,left=80,top=80',
}) {
  const winRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    // Abre ventana nueva
    const w = window.open('', 'BOM_WINDOW', features);

    if (!w) {
      console.warn('Popup bloqueado: no se pudo abrir la ventana del BOM.');
      // Si quieres, aquí puedes disparar un fallback (drawer/modal)
      return;
    }

    winRef.current = w;

    // Documento base
    w.document.title = title;
    w.document.body.style.margin = '0';
    w.document.body.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial';
    w.document.body.style.background = '#f7f7f7';

    // Contenedor donde montamos React
    const div = w.document.createElement('div');
    div.id = 'bom-root';
    div.style.height = '100vh';
    w.document.body.appendChild(div);

    queueMicrotask(() => setPortalContainer(div));

    // Si el usuario cierra la ventana manualmente
    const timer = setInterval(() => {
      if (!winRef.current || winRef.current.closed) {
        clearInterval(timer);
        setPortalContainer(null);
        winRef.current = null;
        onCloseRef.current?.();
      }
    }, 300);

    // También escuchar beforeunload
    const handleUnload = () => {
      setPortalContainer(null);
      winRef.current = null;
      onCloseRef.current?.();
    };

    w.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(timer);
      try {
        w.removeEventListener('beforeunload', handleUnload);
      } catch (err) {
        void err;
      }
      try {
        // si el padre decide cerrar
        if (winRef.current && !winRef.current.closed) winRef.current.close();
      } catch (err) {
        void err;
      }
      setPortalContainer(null);
      winRef.current = null;
    };
  }, [open, title, features]);

  if (!open || !portalContainer) return null;

  return createPortal(children, portalContainer);
}

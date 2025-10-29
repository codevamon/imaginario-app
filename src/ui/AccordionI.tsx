import React, { useState, useRef, useEffect } from 'react';
import './AccordionI.css';

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

const AccordionI: React.FC<Props> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ajuste principal: recalcular maxHeight en cada cambio de contenido o apertura
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (open) {
        el.style.maxHeight = el.scrollHeight + 'px';
        el.style.opacity = '1';
      } else {
        el.style.maxHeight = '0px';
        el.style.opacity = '0';
      }
    };

    updateHeight();

    // 👇 Detecta cambios de tamaño o mutaciones internas (por ejemplo, widgets que se expanden)
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(el);

    // Fallback adicional: MutationObserver (por si ResizeObserver no detecta cambios de nodos)
    const mutationObserver = new MutationObserver(updateHeight);
    mutationObserver.observe(el, { childList: true, subtree: true, attributes: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [open]);

  return (
    <div className={`accordion-i ${open ? 'open' : ''}`}>
      <div className="accordion-header-i" onClick={() => setOpen(!open)}>
        <div className="accordion-header-i-content">
          <h3 className="p1-i _rgl">{title}</h3>
          <span className="accordion-icon-i">
            <img
              src={open ? '/src/assets/icons/Minus.svg' : '/src/assets/icons/Plus.svg'}
              alt={open ? 'Cerrar' : 'Abrir'}
            />
          </span>
        </div>
      </div>

      <div ref={contentRef} className="accordion-content-i">
        <div className="accordion-body-i">{children}</div>
      </div>
    </div>
  );
};

export default AccordionI;

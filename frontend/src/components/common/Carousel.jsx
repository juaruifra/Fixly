import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

/**
 * Calcula el paso horizontal entre dos cards consecutivas, incluido su gap real.
 * Se usa el desplazamiento medido en pantalla para respetar tamaños responsive.
 *
 * @param {DOMRect} firstRect - Medidas de la primera card.
 * @param {DOMRect} secondRect - Medidas de la siguiente card.
 * @returns {number} Distancia horizontal necesaria para alinear la siguiente card.
 */
export function getCarouselStep(firstRect, secondRect) {
  return Math.max(0, secondRect.left - firstRect.left);
}

/**
 * Determina si el viewport puede avanzar en cada dirección, tolerando
 * diferencias subpíxel al comparar scrollLeft con scrollWidth/clientWidth.
 *
 * @param {number} scrollLeft - Posición desplazada actual.
 * @param {number} scrollWidth - Anchura total del contenido desplazable.
 * @param {number} clientWidth - Anchura visible del viewport.
 * @returns {{canScrollBack: boolean, canScrollForward: boolean}} Flechas visibles.
 */
export function getCarouselEdges(scrollLeft, scrollWidth, clientWidth) {
  const edgeTolerance = 4;
  const maximum = Math.max(0, scrollWidth - clientWidth);
  return {
    canScrollBack: scrollLeft > edgeTolerance,
    canScrollForward: maximum - scrollLeft > edgeTolerance,
  };
}

/**
 * Resuelve si la transición de desplazamiento debe ser animada.
 *
 * @param {boolean} prefersReducedMotion - Preferencia del sistema operativo.
 * @returns {"auto"|"smooth"} Comportamiento admitido por scrollBy.
 */
export function getScrollBehavior(prefersReducedMotion) {
  return prefersReducedMotion ? "auto" : "smooth";
}

/**
 * Carrusel horizontal genérico que desplaza una card por pulsación.
 * No conoce los datos ni la navegación de sus children.
 *
 * @param {Object} props - Propiedades de presentación del carrusel.
 * @param {import("react").ReactNode} props.children - Cards u otros elementos.
 * @param {{desktop?:number,tablet?:number,mobile?:number}} [props.itemsPerView]
 *   Cantidad visible por breakpoint; admite fracciones para mostrar la card siguiente.
 * @param {number} [props.gap=18] - Separación horizontal en píxeles CSS.
 * @param {string} [props.label="Elementos"] - Nombre accesible de la región.
 * @returns {import("react").JSX.Element} Viewport desplazable y controles accesibles.
 */
export default function Carousel({
  children,
  itemsPerView = { desktop: 4, tablet: 2.5, mobile: 1.2 },
  gap = 18,
  label = "Elementos",
}) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ canScrollBack: false, canScrollForward: false });

  const refreshEdges = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextEdges = getCarouselEdges(viewport.scrollLeft, viewport.scrollWidth, viewport.clientWidth);
    const focusedArrow = document.activeElement;
    if (
      (focusedArrow?.classList.contains("carousel-arrow-previous") && !nextEdges.canScrollBack)
      || (focusedArrow?.classList.contains("carousel-arrow-next") && !nextEdges.canScrollForward)
    ) {
      viewport.focus({ preventScroll: true });
    }
    setEdges((current) => current.canScrollBack === nextEdges.canScrollBack
      && current.canScrollForward === nextEdges.canScrollForward
      ? current
      : nextEdges);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return undefined;

    refreshEdges();
    viewport.addEventListener("scroll", refreshEdges, { passive: true });
    window.addEventListener("resize", refreshEdges);

    const resizeObserver = new ResizeObserver(refreshEdges);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);

    const mutationObserver = new MutationObserver(refreshEdges);
    mutationObserver.observe(track, { childList: true, subtree: true });

    return () => {
      viewport.removeEventListener("scroll", refreshEdges);
      window.removeEventListener("resize", refreshEdges);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [children, refreshEdges]);

  function scrollOneCard(direction) {
    const viewport = viewportRef.current;
    const cards = trackRef.current?.children;
    if (!viewport || !cards?.length) return;

    const firstRect = cards[0].getBoundingClientRect();
    const secondRect = cards[1]?.getBoundingClientRect();
    const step = secondRect ? getCarouselStep(firstRect, secondRect) : firstRect.width;
    if (step <= 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollBy({ left: direction * step, behavior: getScrollBehavior(prefersReducedMotion) });
  }

  const style = {
    "--carousel-gap": `${gap}px`,
    "--carousel-items-desktop": itemsPerView.desktop ?? 4,
    "--carousel-items-tablet": itemsPerView.tablet ?? 2.5,
    "--carousel-items-mobile": itemsPerView.mobile ?? 1.2,
  };

  return (
    <div className="carousel" style={style}>
      <button
        className="carousel-arrow carousel-arrow-previous"
        type="button"
        aria-label="Desplazar elementos a la izquierda"
        tabIndex={edges.canScrollBack ? 0 : -1}
        hidden={!edges.canScrollBack}
        onClick={() => scrollOneCard(-1)}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </button>
      <div className="carousel-viewport" ref={viewportRef} role="region" aria-label={label} tabIndex={0}>
        <div className="carousel-track" ref={trackRef}>{children}</div>
      </div>
      <button
        className="carousel-arrow carousel-arrow-next"
        type="button"
        aria-label="Desplazar elementos a la derecha"
        tabIndex={edges.canScrollForward ? 0 : -1}
        hidden={!edges.canScrollForward}
        onClick={() => scrollOneCard(1)}
      >
        <ChevronRightIcon aria-hidden="true" />
      </button>
    </div>
  );
}

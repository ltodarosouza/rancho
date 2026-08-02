"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Leaf, Minus, Plus, X } from "lucide-react";
import { CONTACT_HREF } from "@/lib/marketing-content";

const DEFAULT_SECTION_LABEL = "Início";
const MIN_SCREENSHOT_ZOOM = 1;
const MAX_SCREENSHOT_ZOOM = 2.6;
const SCREENSHOT_ZOOM_STEP = 0.35;

type ScreenshotViewerState = {
  src: string;
  title: string;
  detail: string;
  zoom: number;
};

export function MarketingEffects() {
  const [viewer, setViewer] = useState<ScreenshotViewerState | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    root.classList.add("marketing-effects-ready");

    const updateScrollState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || root.scrollTop || 0;
        const maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
        const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));

        root.style.setProperty("--marketing-scroll-progress", progress.toFixed(4));
        root.dataset.marketingScrolled = scrollTop > Math.min(380, window.innerHeight * 0.42) ? "true" : "false";
      });
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const indicator = document.querySelector<HTMLElement>("[data-section-indicator]");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-marketing-section]"));

    const setActiveSection = (section?: HTMLElement) => {
      const label = section?.dataset.sectionLabel || DEFAULT_SECTION_LABEL;
      root.dataset.marketingSection = section?.dataset.marketingSection || "inicio";

      if (indicator && indicator.textContent !== label) {
        indicator.textContent = label;
      }
    };

    let observer: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window && sections.length > 0) {
      observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target instanceof HTMLElement) {
          setActiveSection(visible.target);
        }
      }, {
        rootMargin: "-32% 0px -48% 0px",
        threshold: [0.08, 0.2, 0.45, 0.7]
      });

      sections.forEach((section) => observer?.observe(section));
      setActiveSection(sections[0]);
    }

    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    let revealObserver: IntersectionObserver | null = null;

    if ("IntersectionObserver" in window && revealItems.length > 0) {
      revealItems.forEach((item, index) => {
        item.style.setProperty("--reveal-delay", `${Math.min((index % 5) * 55, 220)}ms`);
        if (item.getBoundingClientRect().top < window.innerHeight * 0.92) {
          item.classList.add("is-visible");
        }
      });

      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!(entry.target instanceof HTMLElement) || !entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        });
      }, {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12
      });

      revealItems.forEach((item) => revealObserver?.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    const spotlightCards = Array.from(document.querySelectorAll<HTMLElement>(".marketing-spotlight"));

    const updateSpotlight = (event: PointerEvent) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;

      const rect = target.getBoundingClientRect();
      target.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
      target.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
    };

    spotlightCards.forEach((card) => card.addEventListener("pointermove", updateSpotlight));

    const openScreenshotViewer = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest<HTMLButtonElement>("[data-screenshot-open]");
      if (!button) return;

      event.preventDefault();
      setViewer({
        src: button.dataset.screenshotSrc || "",
        title: button.dataset.screenshotTitle || "Tela do Rancho",
        detail: button.dataset.screenshotDetail || "Imagem do sistema",
        zoom: MIN_SCREENSHOT_ZOOM
      });
    };

    document.addEventListener("click", openScreenshotViewer);

    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("marketing-effects-ready");
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer?.disconnect();
      revealObserver?.disconnect();
      spotlightCards.forEach((card) => card.removeEventListener("pointermove", updateSpotlight));
      document.removeEventListener("click", openScreenshotViewer);
    };
  }, []);

  useEffect(() => {
    if (!viewer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setViewer(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [viewer]);

  const updateViewerZoom = (direction: "in" | "out") => {
    setViewer((current) => {
      if (!current) return current;

      const nextZoom = direction === "in"
        ? Math.min(MAX_SCREENSHOT_ZOOM, current.zoom + SCREENSHOT_ZOOM_STEP)
        : Math.max(MIN_SCREENSHOT_ZOOM, current.zoom - SCREENSHOT_ZOOM_STEP);

      return { ...current, zoom: Number(nextZoom.toFixed(2)) };
    });
  };

  return (
    <>
      {viewer ? (
        <div className="screenshot-viewer" role="dialog" aria-modal="true" aria-label={`Imagem ampliada: ${viewer.title}`}>
          <div className="screenshot-viewer-panel">
            <div className="screenshot-viewer-header">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">{viewer.detail}</p>
                <h2 className="truncate text-lg font-semibold text-white">{viewer.title}</h2>
              </div>
              <button type="button" className="screenshot-viewer-icon-button" onClick={() => setViewer(null)} aria-label="Fechar imagem">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="screenshot-viewer-stage">
              <Image
                src={viewer.src}
                alt={`Tela ampliada do Rancho: ${viewer.title}`}
                width={2160}
                height={1350}
                unoptimized
                priority
                className="screenshot-viewer-image"
                style={{ width: `${viewer.zoom * 100}%` }}
              />
            </div>
            <div className="screenshot-viewer-controls">
              <button
                type="button"
                className="screenshot-viewer-control"
                onClick={() => updateViewerZoom("out")}
                disabled={viewer.zoom <= MIN_SCREENSHOT_ZOOM}
              >
                <Minus className="h-4 w-4" />
                Reduzir
              </button>
              <span className="screenshot-viewer-zoom">{Math.round(viewer.zoom * 100)}%</span>
              <button
                type="button"
                className="screenshot-viewer-control"
                onClick={() => updateViewerZoom("in")}
                disabled={viewer.zoom >= MAX_SCREENSHOT_ZOOM}
              >
                <Plus className="h-4 w-4" />
                Ampliar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <a href={CONTACT_HREF} className="mobile-marketing-cta" aria-label="Solicitar demonstração do Rancho">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Leaf className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold leading-tight">Conhecer o Rancho</span>
          <span className="block truncate text-xs font-bold text-emerald-50/85">Solicitar demonstração</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0" />
      </a>
    </>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = { images: string[]; name: string };

function useSnapIndex(ref: React.RefObject<HTMLDivElement | null>) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);
  const go = useCallback(
    (i: number, smooth = true) => {
      const el = ref.current;
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: i * el.clientWidth, behavior: smooth && !reduce ? "smooth" : "auto" });
    },
    [ref],
  );
  return { index, go };
}

/**
 * Phone: a swipeable scroll-snap strip (works without JavaScript).
 * Desktop: a large first picture with the rest beside it. Every picture
 * opens the lightbox, which shows all of them.
 */
export function Gallery({ images, name }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const { index } = useSnapIndex(strip);
  const [open, setOpen] = useState<number | null>(null);
  const alt = (i: number) => `${name}, picture ${i + 1} of ${images.length}`;

  return (
    <div>
      <div className="relative sm:hidden">
        <div ref={strip} className="-mx-5 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]" aria-label={`${name} pictures`} tabIndex={0} role="region">
          {images.map((src, i) => (
            <button key={src} type="button" onClick={() => setOpen(i)} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-leaf" aria-label={`Open ${alt(i)}`}>
              <Image src={src} alt={alt(i)} fill sizes="100vw" className="object-cover" priority={i === 0} />
            </button>
          ))}
        </div>
        <p className="pointer-events-none absolute right-3 bottom-3 rounded-[var(--radius-ui)] bg-ink/80 px-2.5 py-1 text-sm text-white" aria-hidden>
          {index + 1} / {images.length}
        </p>
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-3 sm:grid-rows-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative overflow-hidden bg-leaf ${i === 0 ? "col-span-2 row-span-2 min-h-[440px]" : "aspect-[3/2]"} ${i > 2 ? "hidden" : ""}`}
            aria-label={`Open ${alt(i)}`}
          >
            <Image src={src} alt={alt(i)} fill sizes={i === 0 ? "66vw" : "33vw"} className="object-cover transition-transform duration-500 group-hover:scale-[1.025]" priority={i === 0} />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setOpen(0)} className="btn-ghost btn-sm mt-3">
        <Expand className="size-4" aria-hidden />
        See all {images.length} pictures
      </button>

      {open !== null && <Lightbox images={images} start={open} name={name} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Lightbox({ images, start, name, onClose }: { images: string[]; start: number; name: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { index, go } = useSnapIndex(track);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    requestAnimationFrame(() => go(start, false));
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [go, onClose, start]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") go(Math.min(images.length - 1, index + 1));
    if (e.key === "ArrowLeft") go(Math.max(0, index - 1));
  }

  return (
    <dialog
      ref={dialog}
      onKeyDown={onKey}
      aria-label={`${name} pictures`}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-ink p-0 text-white backdrop:bg-ink/90"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <p aria-live="polite" className="text-sm">
            {index + 1} of {images.length}
          </p>
          <button type="button" onClick={onClose} className="btn btn-sm bg-white/10 text-white hover:bg-white/20" autoFocus>
            <X className="size-5" aria-hidden />
            Close
          </button>
        </div>
        <div ref={track} className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
          {images.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0 snap-center">
              <Image src={src} alt={`${name}, picture ${i + 1} of ${images.length}`} fill sizes="100vw" className="object-contain" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <button type="button" onClick={() => go(Math.max(0, index - 1))} disabled={index === 0} className="btn bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft className="size-5" aria-hidden />
            Previous
          </button>
          <button type="button" onClick={() => go(Math.min(images.length - 1, index + 1))} disabled={index === images.length - 1} className="btn bg-white/10 text-white hover:bg-white/20">
            Next
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </dialog>
  );
}

import { useEffect } from "react";

// Blocks that fade/slide in as they enter the viewport. The inline
// `box-shadow` selector picks up the card-like blocks of the older
// inline-styled screens without having to edit each of them.
const BLOCKS = ["[data-reveal]", ".card", "section", "article", "form", "table", '[style*="box-shadow"]'];
const ITEMS = ["ul > li", "tbody > tr", ".doctor-item"];
const SELECTOR = [...BLOCKS, ...ITEMS].join(",");
const SKIP = '[style*="position: fixed"], [style*="position: sticky"], [data-no-reveal]';

/**
 * Staggered reveal-on-scroll for everything inside `ref`. Content that
 * appears later (after data loads) is picked up automatically. Does nothing
 * when the user prefers reduced motion.
 */
export default function useReveal(ref, resetKey) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) return undefined;

    const seen = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        let order = 0;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const delay = Math.min(order++, 8) * 70;
          el.style.setProperty("--reveal-delay", `${delay}ms`);
          el.classList.add("is-revealed");
          io.unobserve(el);
          // Drop the stagger afterwards so hover effects respond instantly.
          setTimeout(() => el.style.removeProperty("--reveal-delay"), delay + 650);
        });
      },
      { rootMargin: "0px 0px -32px 0px", threshold: 0.04 }
    );

    const depth = (el) => {
      let n = 0;
      for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
        if (p.matches(SELECTOR)) n++;
      }
      return n;
    };

    const scan = () => {
      root.querySelectorAll(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (el.matches(SKIP) || el.closest(SKIP)) return;
        // Animate page sections and the cards inside them, plus list rows,
        // but not every nested element (that would look busy).
        const isItem = el.matches(ITEMS.join(","));
        if (depth(el) > (isItem ? 2 : 1)) return;
        el.classList.add("reveal");
        io.observe(el);
      });
    };

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };
    scan();
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, [ref, resetKey]);
}

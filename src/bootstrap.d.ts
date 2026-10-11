// Deklarasi minimal untuk global `bootstrap` (dari vendor/bootstrap.bundle.min.js).
// Hanya bagian yang dipakai app.ts, supaya tidak perlu menambah paket @types.
interface BootstrapModal {
  show(relatedTarget?: HTMLElement): void;
  hide(): void;
}

declare const bootstrap: {
  Modal: {
    getOrCreateInstance(element: Element): BootstrapModal;
  };
};

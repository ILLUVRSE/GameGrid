const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-illuvrse-stroke bg-illuvrse-dusk/70">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-illuvrse-muted">ILLUVRSE</p>
            <p className="mt-2 text-sm text-illuvrse-muted">
              Cinematic originals, curated for explorers.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-illuvrse-muted">
            <a className="transition hover:text-illuvrse-snow" href="https://illuvrse.com/privacy">
              Privacy
            </a>
            <a className="transition hover:text-illuvrse-snow" href="https://illuvrse.com/terms">
              Terms
            </a>
            <a className="transition hover:text-illuvrse-snow" href="https://twitter.com/illuvrse">
              Twitter
            </a>
          </div>
        </div>
        <p className="mt-8 text-xs text-illuvrse-muted">© {currentYear} ILLUVRSE. All rights reserved.</p>
      </div>
    </footer>
  );
}

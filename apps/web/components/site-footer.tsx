export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <p>CodeCompass — understand any codebase, ship your first PR.</p>
        <p className="text-xs">
          Human-in-the-loop by design. Nothing is ever pushed to GitHub automatically.
        </p>
      </div>
    </footer>
  );
}

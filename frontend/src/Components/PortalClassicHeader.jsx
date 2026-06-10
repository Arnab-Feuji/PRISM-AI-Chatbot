import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PortalClassicHeader({
  portalLabel,
  fallbackPath = '/',
  showBack = true,
  children,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <header className="sticky top-0 z-10 w-full shrink-0 border-b border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex min-h-14 sm:min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="flex shrink-0 items-center justify-center p-2 -ml-2 text-[var(--text-main)] transition-opacity hover:opacity-70"
            >
              <ArrowLeft size={22} strokeWidth={2} />
            </button>
          )}

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-extrabold leading-none text-white shadow-lg shadow-[var(--accent)]/25">
              P
            </div>
            {portalLabel ? (
              <div className="min-w-0 text-left leading-none">
                <div className="text-base font-extrabold tracking-tight text-[var(--text-main)]">
                  PRISM
                </div>
                <div className="-mt-0.5 text-xs text-[var(--text-dim)]">{portalLabel}</div>
              </div>
            ) : (
              <div className="text-base font-extrabold leading-none tracking-tight text-[var(--text-main)]">
                PRISM
              </div>
            )}
          </div>
        </div>

        {children ? <div className="flex shrink-0 items-center gap-3">{children}</div> : null}
      </div>
    </header>
  );
}

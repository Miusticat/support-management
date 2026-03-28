import Image from "next/image";
import Link from "next/link";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = getParam(params.callbackUrl) ?? "/";
  const encodedCallback = encodeURIComponent(callbackUrl);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-[var(--color-neutral-white)] sm:px-6 lg:px-8">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffac00]/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#e67e22]/[0.04] blur-[100px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      <section className="animate-fade-in-up relative z-10 w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#141414]/80 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.65),0_0_60px_rgba(255,172,0,0.04)] backdrop-blur-xl sm:p-10">
        {/* Logo and branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="relative mb-4 h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2.5 shadow-[0_0_30px_rgba(255,172,0,0.1)]">
            <Image src="/img/logo.png" alt="Support Management" fill sizes="64px" className="object-contain" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-neutral-white)]">Support Management</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[var(--color-neutral-grey)]">GTA World</p>
        </div>

        {/* Divider */}
        <div className="mb-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        <p className="text-center text-sm leading-relaxed text-[var(--color-neutral-grey)]">
          Inicia sesión con Discord para acceder al panel operativo, historial de sanciones y herramientas internas del equipo.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href={`/api/auth/signin/discord?callbackUrl=${encodedCallback}`}
            className="group relative inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-[#ffac00]/30 bg-[#ffac00]/15 px-4 py-3.5 text-sm font-semibold text-[#ffac00] transition-all duration-200 hover:border-[#ffac00]/50 hover:bg-[#ffac00]/25 hover:shadow-[0_0_30px_rgba(255,172,0,0.15)]"
          >
            {/* Discord icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Continuar con Discord
          </Link>
          <p className="text-center text-xs text-[var(--color-neutral-grey)]/60">
            Solo personal autorizado del servidor puede acceder al dashboard.
          </p>
        </div>
      </section>

      {/* Footer branding */}
      <p className="animate-fade-in fixed bottom-6 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-neutral-grey)]/30">
        GTA World Support System
      </p>
    </main>
  );
}

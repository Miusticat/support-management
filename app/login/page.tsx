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

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#141414] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.65)] sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.03] p-2">
            <Image src="/img/logo.png" alt="Support Management" fill sizes="48px" className="object-contain" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-neutral-grey)]">Access Control</p>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--color-neutral-white)]">Support Management</h1>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--color-neutral-grey)]">
          Inicia sesión con Discord para acceder al panel operativo, historial de sanciones y herramientas internas del equipo.
        </p>

        <div className="mt-7 space-y-3">
          <Link
            href={`/api/auth/signin/discord?callbackUrl=${encodedCallback}`}
            className="group inline-flex w-full items-center justify-center rounded-2xl border border-[#ffac00]/40 bg-[#ffac00]/20 px-4 py-3 text-sm font-semibold text-[#ffac00] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ffac00]/30"
          >
            Continuar con Discord
          </Link>
          <p className="text-center text-xs text-[var(--color-neutral-grey)]">
            Solo personal autorizado del servidor puede acceder al dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}

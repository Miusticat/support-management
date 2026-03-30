"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Award, Clipboard, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { UICard } from "@/app/components/ui-card";

type PublishState = {
  loading: boolean;
  error: string | null;
  success: string | null;
};

type SupportOption = {
  id: string;
  displayName: string;
};

type ApiErrorResponse = {
  error?: string;
};

type PositivePointCategory = {
  accion: string;
  puntos: number;
  descripcion: string;
};

type PointCategoryKey =
  | "Calidad en la gestión de tickets"
  | "Compromiso y profesionalismo"
  | "Aporte estructural al equipo"
  | "Constancia y desempeño sostenido";

type SelectedMerit = {
  category: string;
  accion: string;
  puntos: number;
  descripcion: string;
};

const pointsCategories: Record<PointCategoryKey, PositivePointCategory[]> = {
  "Calidad en la gestión de tickets": [
    {
      accion: "Gestión correcta y completa de tickets de forma consistente",
      puntos: 1,
      descripcion: "Cumplimiento correcto de funciones",
    },
    {
      accion: "Resolución de tickets complejos con criterio adecuado",
      puntos: 2,
      descripcion: "Buen desempeño sostenido",
    },
    {
      accion: "Resolución de conflictos entre usuarios con resultado positivo verificable",
      puntos: 2,
      descripcion: "Resolución compleja",
    },
    {
      accion: "Mantener alta calidad en la atención durante un periodo prolongado",
      puntos: 2,
      descripcion: "Impacto positivo claro",
    },
    {
      accion: "Gestión ejemplar documentada (caso modelo para el equipo)",
      puntos: 3,
      descripcion: "Impacto significativo",
    },
  ],
  "Compromiso y profesionalismo": [
    {
      accion: "Manejo destacado de situaciones difíciles con autocontrol y criterio",
      puntos: 2,
      descripcion: "Buen desempeño sostenido",
    },
    {
      accion: "Aplicación consistente del feedback recibido",
      puntos: 1,
      descripcion: "Cumplimiento correcto",
    },
    {
      accion: "Evolución notable en desempeño tras correcciones",
      puntos: 2,
      descripcion: "Resolución compleja",
    },
    {
      accion: "Actuar como referencia positiva dentro del equipo",
      puntos: 2,
      descripcion: "Impacto positivo claro",
    },
    {
      accion: "Apoyo activo en momentos de alta carga del staff",
      puntos: 1,
      descripcion: "Cumplimiento correcto",
    },
  ],
  "Aporte estructural al equipo": [
    {
      accion: "Proponer o hacer mejoras aplicables",
      puntos: 2,
      descripcion: "Buen desempeño sostenido",
    },
    {
      accion: "Crear o mejorar guías/documentación utilizadas por el equipo",
      puntos: 3,
      descripcion: "Impacto significativo",
    },
    {
      accion: "Contribuir a la formación de otros Supports",
      puntos: 2,
      descripcion: "Resolución compleja",
    },
    {
      accion: "Participación activa en iniciativas del staff",
      puntos: 1,
      descripcion: "Cumplimiento correcto",
    },
  ],
  "Constancia y desempeño sostenido": [
    {
      accion: "Mantener desempeño alto y estable durante 2 semanas",
      puntos: 2,
      descripcion: "Buen desempeño sostenido",
    },
    {
      accion: "Mantener desempeño destacado durante 1 mes",
      puntos: 3,
      descripcion: "Impacto significativo",
    },
    {
      accion: "Cero sanciones + desempeño positivo durante periodo evaluado",
      puntos: 5,
      descripcion: "Impacto significativo excepcional",
    },
  ],
};

const pointCategoryOptions = Object.keys(pointsCategories) as PointCategoryKey[];

const pointLevelLabel = (points: number) => {
  if (points <= 0.5) return "Normal";
  if (points <= 1) return "Intermedio";
  if (points <= 2) return "Alto";
  return "Excepcional";
};

const pointLevelColor = (points: number): string => {
  if (points <= 0.5) return "#fbbf24";
  if (points <= 1) return "#f97316";
  if (points <= 2) return "#10b981";
  return "#06b6d4";
};

function todayAsPointsDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidDateFormat(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function formatInputDateToPointsDate(value: string) {
  if (!isValidDateFormat(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

function buildAutoJustificacionTemplate(
  supportOtorgado: string,
  merits: SelectedMerit[],
  totalPoints: number
) {
  const supportLabel = supportOtorgado.trim() || "el integrante Support";

  if (merits.length === 0) {
    return "";
  }

  return [
    `Se otorgan ${totalPoints} punto(s) positivo(s) a ${supportLabel} por:`,
    ...merits.map((merit, index) => `${index + 1}. [${merit.category}] ${merit.accion}`),
    `Total de puntos: ${totalPoints} punto(s).`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDiscordMention(discordId: string, fallback: string) {
  if (/^\d{17,20}$/.test(discordId.trim())) {
    return `<@${discordId.trim()}>`;
  }

  return fallback.trim() || "-";
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function DiscordPositivePointsStudio() {
  const { data: session } = useSession();

  const [fecha, setFecha] = useState(todayAsPointsDate());
  const [supportOtorgado, setSupportOtorgado] = useState("");
  const [supportDiscordId, setSupportDiscordId] = useState("");
  const [supportPcuLink, setSupportPcuLink] = useState("");
  const [adminOtorga, setAdminOtorga] = useState("");
  const [adminDiscordId, setAdminDiscordId] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [pointCategory, setPointCategory] = useState<PointCategoryKey>("Calidad en la gestión de tickets");
  const [pointAction, setPointAction] = useState(
    pointsCategories["Calidad en la gestión de tickets"][0]?.accion ?? ""
  );
  const [selectedMerits, setSelectedMerits] = useState<SelectedMerit[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [evidencia, setEvidencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [supportOptions, setSupportOptions] = useState<SupportOption[]>([]);
  const [supportOptionsLoading, setSupportOptionsLoading] = useState(true);
  const [supportOptionsError, setSupportOptionsError] = useState<string | null>(null);
  const [publish, setPublish] = useState<PublishState>({
    loading: false,
    error: null,
    success: null,
  });

  const totalPoints = useMemo(
    () => selectedMerits.reduce((sum, merit) => sum + merit.puntos, 0),
    [selectedMerits]
  );

  const levelText = useMemo(() => pointLevelLabel(totalPoints), [totalPoints]);
  const accentColor = useMemo(() => pointLevelColor(totalPoints), [totalPoints]);
  const categoriasText = useMemo(
    () => (categorias.length > 0 ? categorias.join(" / ") : "-"),
    [categorias]
  );
  const dateIsValid = useMemo(() => isValidDateFormat(fecha), [fecha]);
  const pcuLinkIsValid = useMemo(
    () => /^https?:\/\//i.test(supportPcuLink.trim()),
    [supportPcuLink]
  );

  const currentMerits = useMemo(
    () => pointsCategories[pointCategory] ?? [],
    [pointCategory]
  );

  const selectedMeritsText = useMemo(
    () =>
      selectedMerits.length > 0
        ? selectedMerits
            .map((merit, index) => `${index + 1}. [${merit.category}] ${merit.accion} (+${merit.puntos})`)
            .join("\n")
        : "-",
    [selectedMerits]
  );

  const adminMentionPreview = useMemo(
    () => formatDiscordMention(adminDiscordId, adminOtorga),
    [adminDiscordId, adminOtorga]
  );

  const supportMentionPreview = useMemo(
    () => formatDiscordMention(supportDiscordId, supportOtorgado),
    [supportDiscordId, supportOtorgado]
  );

  const previewMentionsText = useMemo(() => {
    const mentions: string[] = [];

    if (/^\d{17,20}$/.test(adminDiscordId.trim())) {
      mentions.push(`<@${adminDiscordId.trim()}>`);
    }

    if (/^\d{17,20}$/.test(supportDiscordId.trim())) {
      mentions.push(`<@${supportDiscordId.trim()}>`);
    }

    return mentions.length > 0 ? `Mencionados: ${mentions.join(" ")}` : "";
  }, [adminDiscordId, supportDiscordId]);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];

    if (!fecha.trim()) missing.push("Fecha");
    if (!supportOtorgado.trim()) missing.push("Support a recompensar");
    if (!supportPcuLink.trim()) missing.push("Link de PCU");
    if (selectedMerits.length === 0) missing.push("Al menos un mérito");
    if (!adminOtorga.trim()) missing.push("Admin que otorga");
    if (!justificacion.trim()) missing.push("Justificación");

    return missing;
  }, [fecha, supportOtorgado, supportPcuLink, selectedMerits.length, adminOtorga, justificacion]);

  useEffect(() => {
    if (selectedMerits.length === 0) {
      setJustificacion("");
      return;
    }

    setJustificacion(
      buildAutoJustificacionTemplate(
        supportOtorgado,
        selectedMerits,
        totalPoints
      )
    );
  }, [supportOtorgado, selectedMerits, totalPoints]);

  const previewDescription = useMemo(() => {
    return {
      adminBlock: [
        `### Fecha:\n${formatInputDateToPointsDate(fecha) || "(DD/MM/AA)"}`,
        `### Datos del Admin que otorga:`,
        `* Admin que otorga: ${adminMentionPreview} (${adminOtorga || "-"})`,
      ].join("\n"),
      supportBlock: [
        `### Datos del Support:`,
        `* Support recompensado: ${supportMentionPreview} (${supportOtorgado || "-"})`,
        `* Link de PCU: ${supportPcuLink || "-"}`,
      ].join("\n"),
      justificacionBlock: `**Justificación:**\n${justificacion || "(Explicación clara del mérito)"}`,
      evalFields: [
        { name: "Méritos agregados", value: String(selectedMerits.length) },
        { name: "Puntos totales", value: String(totalPoints) },
        { name: "Categorías", value: categoriasText },
      ],
      evidenciaBlock: `**Evidencia:**\n${evidencia || "-"}`,
      pointFields: [
        { name: "Puntos otorgados", value: `${totalPoints} (${levelText})` },
      ],
      observacionesBlock: `**Observaciones:**\n${observaciones || "-"}`,
    };
  }, [
    fecha,
    adminMentionPreview,
    adminOtorga,
    supportMentionPreview,
    supportOtorgado,
    supportPcuLink,
    justificacion,
    selectedMerits,
    categorias,
    totalPoints,
    levelText,
    evidencia,
    observaciones,
  ]);

  useEffect(() => {
    const adminFromSession =
      session?.user?.name?.trim() || session?.user?.email?.trim() || "";
    const adminDiscordFromSession = session?.user?.discordUserId?.trim() || "";

    if (!adminOtorga.trim() && adminFromSession) {
      setAdminOtorga(adminFromSession);
    }

    if (!adminDiscordId && adminDiscordFromSession) {
      setAdminDiscordId(adminDiscordFromSession);
    }
  }, [session?.user?.name, session?.user?.email, session?.user?.discordUserId, adminOtorga, adminDiscordId]);

  useEffect(() => {
    let active = true;

    async function loadSupportOptions(showLoading: boolean) {
      if (showLoading) {
        setSupportOptionsLoading(true);
      }

      setSupportOptionsError(null);

      try {
        const response = await fetch("/api/discord/support-members", {
          method: "GET",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          const errorData = await parseJsonSafe<ApiErrorResponse>(response);
          throw new Error(errorData?.error || "No se pudo obtener la lista de Supports");
        }

        const data = await parseJsonSafe<{ members?: SupportOption[] }>(response);
        if (!active) {
          return;
        }

        const nextMembers = Array.isArray(data?.members) ? data.members : [];
        setSupportOptions(nextMembers);
        setSupportOtorgado((currentSelection) =>
          currentSelection &&
          !nextMembers.some((member) => member.displayName === currentSelection)
            ? ""
            : currentSelection
        );
        setSupportDiscordId((currentId) =>
          currentId && !nextMembers.some((member) => member.id === currentId)
            ? ""
            : currentId
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Error desconocido";
        setSupportOptionsError(message);
      } finally {
        if (active) {
          setSupportOptionsLoading(false);
        }
      }
    }

    void loadSupportOptions(true);

    const intervalId = window.setInterval(() => {
      void loadSupportOptions(false);
    }, 15000);

    const onWindowFocus = () => {
      void loadSupportOptions(false);
    };

    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onWindowFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onWindowFocus);
    };
  }, []);

  function selectPointCategory(category: PointCategoryKey) {
    setPointCategory(category);
    const firstMerit = pointsCategories[category]?.[0];

    if (!firstMerit) {
      setPointAction("");
      return;
    }

    setPointAction(firstMerit.accion);

    if (categorias.length === 0) {
      setCategorias([category]);
    }
  }

  function addMeritToRecord() {
    const merit = currentMerits.find((item) => item.accion === pointAction);
    if (!merit) {
      return;
    }

    const key = `${pointCategory}::${pointAction}`;
    if (selectedMerits.some((item) => `${item.category}::${item.accion}` === key)) {
      return;
    }

    const next = [
      ...selectedMerits,
      {
        category: pointCategory,
        accion: pointAction,
        puntos: merit.puntos,
        descripcion: merit.descripcion,
      },
    ];

    setSelectedMerits(next);
    const mergedCategories = Array.from(new Set(next.map((item) => item.category)));
    setCategorias(mergedCategories);
  }

  function removeMeritFromRecord(indexToRemove: number) {
    const next = selectedMerits.filter((_, index) => index !== indexToRemove);
    setSelectedMerits(next);
    const mergedCategories = Array.from(new Set(next.map((item) => item.category)));
    setCategorias(mergedCategories);
  }

  function selectMerit(accion: string) {
    setPointAction(accion);
    const merit = currentMerits.find((item) => item.accion === accion);

    if (!merit) {
      return;
    }
  }

  async function copyPreview() {
    const previewText = [
      "## Registro de Puntos Positivos:",
      "### Fecha:",
      formatInputDateToPointsDate(fecha) || "(DD/MM/AA)",
      "",
      "### Administrador que otorga:",
      `* Administrador: ${adminOtorga || "-"}`,
      "",
      "### Datos del Support:",
      `* Support recompensado: ${supportOtorgado || "-"}`,
      `* Link de PCU: ${supportPcuLink || "-"}`,
      "",
      "**Justificación:**",
      justificacion || "(Explicación clara del mérito)",
      "",
      "**Méritos otorgados:**",
      selectedMeritsText,
      "",
      "**Categorías:**",
      categoriasText,
      "",
      "**Evidencia:**",
      evidencia || "-",
      "",
      "**Puntos:**",
      `Total: ${totalPoints} punto(s) (${levelText})`,
      "",
      "**Observaciones:**",
      observaciones || "-",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(previewText);
      setCopyStatus("Preview copiado");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("No se pudo copiar");
      setTimeout(() => setCopyStatus(null), 2000);
    }
  }

  async function publishPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (missingRequired.length > 0) {
      setPublish({
        loading: false,
        error: `Completa los campos obligatorios: ${missingRequired.join(", ")}`,
        success: null,
      });
      return;
    }

    if (!dateIsValid) {
      setPublish({ loading: false, error: "Fecha invalida. Usa DD/MM/AA.", success: null });
      return;
    }

    if (!pcuLinkIsValid) {
      setPublish({
        loading: false,
        error: "Link de PCU invalido. Debe iniciar con http:// o https://.",
        success: null,
      });
      return;
    }

    setPublish({ loading: true, error: null, success: null });

    try {
      const response = await fetch("/api/discord/positive-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: formatInputDateToPointsDate(fecha),
          supportOtorgado,
          supportDiscordId,
          supportPcuLink: supportPcuLink.trim(),
          adminOtorga,
          adminDiscordId,
          justificacion,
          pointCategory,
          pointAction,
          merits: selectedMerits,
          categorias,
          evidencia,
          totalPoints,
          observaciones,
        }),
      });

      const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "No se pudieron registrar los puntos positivos");
      }

      setPublish({
        loading: false,
        error: null,
        success: `Puntos positivos registrados (${totalPoints} punto(s)). Enviado a Discord.`,
      });

      setEvidencia("");
      setObservaciones("");
      setSupportOtorgado("");
      setSupportDiscordId("");
      setSupportPcuLink("");
      setJustificacion("");
      setSelectedMerits([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setPublish({ loading: false, error: message, success: null });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <UICard className="xl:col-span-7 p-6">
        <div className="mb-8 flex items-start gap-3">
          <div className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-[#10b981]/35 bg-[#10b981]/15 text-[#10b981]">
            <Award className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Discord</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">Otorgar Puntos Positivos</h2>
            <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">
              Registra méritos del staff con criterios de calidad verificable, evitando farmeo de puntos.
            </p>
          </div>
        </div>

        <form onSubmit={publishPoints} className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#10b981]/40"
              />
              {!dateIsValid ? (
                <p className="mt-1 text-xs text-[var(--color-accent-red)]">Selecciona una fecha valida.</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Support a recompensar</span>
              <select
                value={supportDiscordId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setSupportDiscordId(selectedId);

                  const selectedSupport = supportOptions.find(
                    (support) => support.id === selectedId
                  );
                  setSupportOtorgado(selectedSupport?.displayName ?? "");
                }}
                required
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#10b981]/40"
                style={{ colorScheme: "dark" }}
                disabled={supportOptionsLoading || supportOptions.length === 0}
              >
                <option value="" className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                  {supportOptionsLoading ? "Cargando supports..." : "Selecciona un support"}
                </option>
                {supportOptions.map((support) => (
                  <option key={support.id} value={support.id} className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                    {support.displayName}
                  </option>
                ))}
              </select>
              {supportOptionsError ? (
                <p className="mt-2 text-xs text-[var(--color-accent-red)]">{supportOptionsError}</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Link de PCU</span>
              <input
                value={supportPcuLink}
                onChange={(e) => setSupportPcuLink(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#10b981]/40"
                placeholder="https://pcu-es.gta.world/view/user/xxxx"
              />
              {!pcuLinkIsValid ? (
                <p className="mt-1 text-xs text-[var(--color-accent-red)]">Debe empezar con http:// o https://</p>
              ) : null}
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Categoría del mérito</span>
              <select
                value={pointCategory}
                onChange={(e) => selectPointCategory(e.target.value as PointCategoryKey)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#10b981]/40"
                style={{ colorScheme: "dark" }}
              >
                {pointCategoryOptions.map((category) => (
                  <option key={category} value={category} className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Acción específica</span>
              <select
                value={pointAction}
                onChange={(e) => selectMerit(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#10b981]/40"
                style={{ colorScheme: "dark" }}
              >
                {currentMerits.map((merit) => (
                  <option key={merit.accion} value={merit.accion} className="bg-[#1a1a1a] text-[var(--color-neutral-white)]">
                    {merit.accion} (+{merit.puntos})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={addMeritToRecord}
              className="mt-3 rounded-lg border border-[#10b981]/40 bg-[#10b981]/12 px-3 py-2 text-xs text-[#10b981]"
            >
              Agregar mérito al registro
            </button>

            <div className="mt-3 space-y-2">
              <p className="text-xs text-[var(--color-neutral-grey)]">Méritos agregados: {selectedMerits.length}</p>
              {selectedMerits.length === 0 ? (
                <p className="text-xs text-[var(--color-neutral-grey)]">No hay méritos agregados todavia.</p>
              ) : (
                selectedMerits.map((merit, index) => (
                  <div
                    key={`${merit.category}-${merit.accion}`}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs text-[var(--color-neutral-white)]">[{merit.category}] {merit.accion}</p>
                      <p className="text-[11px] text-[var(--color-neutral-grey)]">Puntos: +{merit.puntos}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeritFromRecord(index)}
                      className="text-xs text-[var(--color-accent-red)]"
                    >
                      Quitar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Justificación (autogenerada)</span>
              <textarea
                value={justificacion}
                readOnly
                required
                className="min-h-24 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#10b981]/40"
                placeholder="Se completa automaticamente al agregar méritos."
              />
              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
                Todos los punctos deben ser justificados y verificables. Se actualiza en tiempo real.
              </p>
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Evidencia (opcional)</span>
              <textarea
                value={evidencia}
                onChange={(e) => setEvidencia(e.target.value)}
                className="min-h-16 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#10b981]/40"
                placeholder="Links, logs, capturas, tickets resueltos, feedback de usuarios..."
              />
              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
                Agrega evidencia que respalde el mérito (tickets, logs, feedback verificable).
              </p>
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Observaciones (opcional)</span>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="min-h-16 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#10b981]/40"
                placeholder="Contexto adicional o notas relevantes..."
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={publish.loading || missingRequired.length > 0 || !dateIsValid || !pcuLinkIsValid}
            className="w-full rounded-xl border border-[#10b981]/45 bg-[#10b981]/14 px-4 py-3 text-sm font-medium text-[var(--color-neutral-white)] transition-all duration-200 hover:bg-[#10b981]/24 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="mb-0.5 mr-2 inline h-4 w-4" />
            {publish.loading ? "Registrando..." : "Otorgar puntos positivos"}
          </button>

          {missingRequired.length > 0 ? (
            <div className="rounded-lg border border-[var(--color-accent-red)]/20 bg-[var(--color-accent-red)]/8 p-3 text-xs text-[var(--color-accent-red)]">
              Completa: {missingRequired.join(", ")}
            </div>
          ) : null}

          {publish.error ? (
            <div className="rounded-lg border border-[var(--color-accent-red)]/20 bg-[var(--color-accent-red)]/8 p-3 text-xs text-[var(--color-accent-red)]">
              {publish.error}
            </div>
          ) : null}

          {publish.success ? (
            <div className="rounded-lg border border-[#10b981]/20 bg-[#10b981]/8 p-3 text-xs text-[#10b981]">
              ✓ {publish.success}
            </div>
          ) : null}
        </form>
      </UICard>

      <UICard className="xl:col-span-5 p-6 sticky top-24">
        <div className="mb-6 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-[var(--color-neutral-white)]">Resumen</h3>
          <button
            type="button"
            onClick={copyPreview}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-xs text-[var(--color-neutral-grey)] hover:text-[var(--color-neutral-white)] transition-colors"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Copiar
          </button>
        </div>
        {copyStatus ? <p className="mb-4 text-xs text-[#10b981]">✓ {copyStatus}</p> : null}

        <div className="space-y-4">
          {supportOtorgado && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Support</p>
              <p className="text-sm font-semibold text-[var(--color-neutral-white)]">{supportOtorgado}</p>
            </div>
          )}

          {justificacion && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Justificación</p>
              <p className="text-xs text-[var(--color-neutral-grey)] leading-relaxed">{justificacion.slice(0, 150)}{justificacion.length > 150 ? "..." : ""}</p>
            </div>
          )}

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-3">Puntos otorgados</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-neutral-white)]">{totalPoints} punto{totalPoints !== 1 ? "s" : ""}</span>
              <span className="text-xs rounded-lg px-3 py-1.5" style={{ color: accentColor, backgroundColor: `${accentColor}20` }}>
                {levelText}
              </span>
            </div>
          </div>

          {categorias.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Categorías</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map(cat => (
                  <span key={cat} className="text-xs rounded-md border border-[#10b981]/30 bg-[#10b981]/10 text-[#10b981] px-2 py-1">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {evidencia && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Evidencia</p>
              <p className="text-xs text-[var(--color-neutral-grey)]">✓ Añadida ({evidencia.length} caracteres)</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-0 overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] bg-[#1e1f22] flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-full bg-[#10b981] text-[7px] font-bold text-white">
              SM
            </div>
            <span className="text-sm font-semibold text-[#f2f3f5]">Support Management</span>
            <span className="rounded bg-[#10b981] px-1 py-0.5 text-[10px] font-medium text-white">BOT</span>
            <span className="text-xs text-[#949ba4]">Ahora</span>
          </div>

          {previewMentionsText && (
            <p className="mb-3 text-sm text-[#dbdee1]">{previewMentionsText}</p>
          )}

          <div
            className="overflow-hidden"
            style={{ background: "#1e1f22", borderLeft: `3px solid ${accentColor}` }}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                <h3 className="text-base font-bold text-[#f2f3f5]">Puntos Positivos Otorgados</h3>
              </div>

              <div className="rounded bg-[#2b2d31] border-l-4 p-3" style={{ borderColor: accentColor }}>
                <p className="text-xs font-semibold text-[#949ba4]">Puntos totales</p>
                <p className="text-sm font-bold text-[#f2f3f5]">{totalPoints} punto{totalPoints !== 1 ? "s" : ""} ({levelText})</p>
              </div>

              {supportOtorgado && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">**Support:** {supportOtorgado}</p>
                </>
              )}

              {justificacion && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1]"><strong>Justificación:</strong></p>
                  <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">{justificacion}</p>
                </>
              )}

              {evidencia && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1]"><strong>Evidencia:</strong></p>
                  <p className="text-sm text-[#dbdee1]">{evidencia}</p>
                </>
              )}

              <div className="border-t border-white/[0.15]" />
              <p className="text-[11px] text-[#949ba4]">Generado por Support Management</p>
            </div>
          </div>
        </div>
      </UICard>
    </div>
  );
}

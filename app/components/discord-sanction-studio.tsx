"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clipboard, Send } from "lucide-react";
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

type PolicyInfraction = {
  fault: string;
  sanction: string;
  tags: string[];
};

const categoryOptions = ["Conducta", "Staff", "RP", "Comandos", "Criterio", "Actividad", "Ausencias"];
const defaultPolicyCategory = "Conducta y actitud";

const policyInfractions: Record<string, PolicyInfraction[]> = {
  "Conducta y actitud": [
    {
      fault: "Responder de forma agresiva, cortante o poco profesional",
      sanction: "Warn Intermedio",
      tags: ["Conducta", "Staff"],
    },
    {
      fault: "Falta de respeto hacia usuarios",
      sanction: "Warn Grave",
      tags: ["Conducta", "Staff"],
    },
    {
      fault: "Falta de respeto hacia miembros del staff",
      sanction: "Warn Grave",
      tags: ["Conducta", "Staff"],
    },
    {
      fault: "Actitud toxica o provocadora",
      sanction: "Warn Grave",
      tags: ["Conducta", "Staff"],
    },
    {
      fault: "Generar discusiones innecesarias con usuarios",
      sanction: "Warn Intermedio",
      tags: ["Conducta"],
    },
    {
      fault: "Uso de sarcasmo o burlas hacia usuarios",
      sanction: "Warn Grave",
      tags: ["Conducta"],
    },
    {
      fault: "Actitud de superioridad frente a la comunidad",
      sanction: "Warn Grave",
      tags: ["Conducta"],
    },
    {
      fault: "Desacreditar decisiones del staff publicamente",
      sanction: "Warn Grave",
      tags: ["Conducta", "Staff"],
    },
  ],
  "Conducta dentro del equipo de staff": [
    {
      fault: "No aceptar feedback o correcciones",
      sanction: "Warn Intermedio",
      tags: ["Staff", "Criterio"],
    },
    {
      fault: "Actitud defensiva o conflictiva ante feedback",
      sanction: "Warn Grave",
      tags: ["Staff", "Conducta"],
    },
    {
      fault: "Ignorar indicaciones de Support Trainers o Support Lead",
      sanction: "Warn Grave",
      tags: ["Staff", "Criterio"],
    },
    {
      fault: "Discutir decisiones administrativas de forma inapropiada",
      sanction: "Warn Grave",
      tags: ["Staff", "Conducta"],
    },
    {
      fault: "Generar mal ambiente dentro del equipo",
      sanction: "Warn Grave",
      tags: ["Staff", "Conducta"],
    },
  ],
  "Comportamiento en Roleplay": [
    {
      fault: "Incumplir normas del servidor en RP",
      sanction: "Warn Grave",
      tags: ["RP"],
    },
    {
      fault: "No dar ejemplo dentro del roleplay",
      sanction: "Warn Intermedio",
      tags: ["RP"],
    },
    {
      fault: "Realizar acciones antirol siendo staff",
      sanction: "Warn Grave",
      tags: ["RP"],
    },
    {
      fault: "Arruinar o interrumpir situaciones de roleplay",
      sanction: "Warn Grave",
      tags: ["RP"],
    },
    {
      fault: "Uso de informacion OOC (Metagaming)",
      sanction: "Remocion",
      tags: ["RP", "Criterio"],
    },
    {
      fault: "Forzar situaciones de rol injustificadamente",
      sanction: "Warn Grave",
      tags: ["RP"],
    },
    {
      fault: "Intervenir como staff sin justificacion",
      sanction: "Warn Grave",
      tags: ["RP", "Criterio"],
    },
    {
      fault: "Uso del rol de staff para intimidar jugadores",
      sanction: "Remocion",
      tags: ["RP", "Staff"],
    },
  ],
  "Uso de herramientas administrativas": [
    {
      fault: "Uso incorrecto de comandos o herramientas",
      sanction: "Advertencia",
      tags: ["Comandos"],
    },
    {
      fault: "Uso con beneficio propio",
      sanction: "Warn Grave",
      tags: ["Comandos", "Criterio"],
    },
    {
      fault: "Uso para evadir sanciones propias",
      sanction: "Suspension",
      tags: ["Comandos", "Staff"],
    },
    {
      fault: "Abuso de poderes de staff",
      sanction: "Remocion",
      tags: ["Comandos", "Criterio", "Staff"],
    },
  ],
  "Gestion de situaciones y criterio": [
    {
      fault: "Resolver tickets sin revisar correctamente",
      sanction: "Advertencia",
      tags: ["Criterio", "Actividad"],
    },
    {
      fault: "Tomar decisiones sin notificar",
      sanction: "Warn Grave",
      tags: ["Criterio", "Staff"],
    },
    {
      fault: "Ignorar reportes o tickets",
      sanction: "Advertencia",
      tags: ["Criterio", "Actividad"],
    },
    {
      fault: "Favorecer a conocidos o amigos",
      sanction: "Warn Grave",
      tags: ["Criterio", "Staff"],
    },
    {
      fault: "Intervenir innecesariamente en situaciones",
      sanction: "Warn Intermedio",
      tags: ["Criterio"],
    },
  ],
  "Actividad e inactividad": [
    {
      fault: "Baja actividad sin justificacion",
      sanction: "Advertencia",
      tags: ["Actividad"],
    },
    {
      fault: "No atender tickets estando disponible",
      sanction: "Advertencia",
      tags: ["Actividad"],
    },
    {
      fault: "Ignorar tickets de forma reiterada",
      sanction: "Warn Intermedio",
      tags: ["Actividad"],
    },
    {
      fault: "Conectarse sin ejercer funciones de soporte",
      sanction: "Warn Intermedio",
      tags: ["Actividad"],
    },
    {
      fault: "Inactividad prolongada sin aviso",
      sanction: "Remocion",
      tags: ["Actividad"],
    },
  ],
  "Sistema de ausencias": [
    {
      fault: "Ausencia menor a 3 dias sin aviso",
      sanction: "Advertencia",
      tags: ["Ausencias", "Actividad"],
    },
    {
      fault: "Ausencia mayor a 5 dias sin aviso",
      sanction: "Warn Intermedio",
      tags: ["Ausencias", "Actividad"],
    },
    {
      fault: "Ausencia prolongada sin comunicacion",
      sanction: "Remocion",
      tags: ["Ausencias", "Actividad"],
    },
  ],
};

const sanctionOptions = ["Advertencia", "Warn Intermedio", "Warn Grave", "Suspension", "Remocion"];
const selectClassName =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[var(--color-neutral-white)] outline-none transition-all focus:border-[#ffac00]/40";
const optionClassName = "bg-[#1a1a1a] text-[var(--color-neutral-white)]";

function todayAsSanctionDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanctionLevelLabel(sanction: string) {
  switch (sanction) {
    case "Advertencia":
      return "Nivel 1";
    case "Warn Intermedio":
      return "Nivel 2";
    case "Warn Grave":
      return "Nivel 3";
    case "Suspension":
      return "Nivel 4";
    case "Remocion":
      return "Nivel 5";
    default:
      return "Nivel -";
  }
}

function sanctionAccentColor(sanction: string): string {
  switch (sanction) {
    case "Advertencia":
      return "#fbbf24";
    case "Warn Intermedio":
      return "#f97316";
    case "Warn Grave":
      return "#ef4444";
    case "Suspension":
      return "#dc2626";
    case "Remocion":
      return "#991b1b";
    default:
      return "#ff6b84";
  }
}

function isValidDateFormat(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

function formatInputDateToSanctionDate(value: string) {
  if (!isValidDateFormat(value)) {
    return value;
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(-2)}`;
}

function buildMotivoTemplate(
  supportSancionado: string,
  policyCategory: string,
  policyFault: string,
  sancion: string,
  levelText: string,
  pruebas: string
) {
  const supportLabel = supportSancionado.trim() || "el integrante Support";

  return [
    `Tras la revision del caso, ${supportLabel} presenta una infraccion clasificada como "${policyFault}" dentro del bloque "${policyCategory}".`,
    `Con base en los antecedentes y la politica interna, corresponde aplicar ${sancion} (${levelText}).`,
    pruebas.trim()
      ? `La decision se sustenta en las pruebas registradas: ${pruebas.trim()}.`
      : "La decision se sustenta en el analisis por parte de Support Management",
  ].join("\n");
}

function suggestedSanction(
  sanction: string,
  prevAdvertencias: number,
  prevWarnIntermedios: number,
  prevWarnGraves: number,
  criticalCase: boolean
) {
  if (criticalCase && sanction === "Warn Grave") {
    return "Remocion";
  }

  const intermediosTotal = prevWarnIntermedios + (sanction === "Warn Intermedio" ? 1 : 0);

  if (intermediosTotal >= 3) {
    return "Remocion";
  }

  if (sanction === "Warn Grave" && (prevWarnIntermedios > 0 || prevWarnGraves > 0)) {
    return "Suspension";
  }

  if (sanction === "Advertencia" && prevAdvertencias >= 1) {
    return "Warn Intermedio";
  }

  return sanction;
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

export function DiscordSanctionStudio() {
  const { data: session } = useSession();

  const [fecha, setFecha] = useState(todayAsSanctionDate());
  const [supportSancionado, setSupportSancionado] = useState("");
  const [supportDiscordId, setSupportDiscordId] = useState("");
  const [supportPcuLink, setSupportPcuLink] = useState("");
  const [adminSanciona, setAdminSanciona] = useState("");
  const [adminDiscordId, setAdminDiscordId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [policyCategory, setPolicyCategory] = useState(defaultPolicyCategory);
  const [policyFault, setPolicyFault] = useState(
    policyInfractions[defaultPolicyCategory][0]?.fault ?? ""
  );
  const [categorias, setCategorias] = useState<string[]>([]);
  const [pruebas, setPruebas] = useState("");
  const [sancion, setSancion] = useState(
    policyInfractions["Conducta y actitud"][0]?.sanction ?? "Advertencia"
  );
  const [prevAdvertencias, setPrevAdvertencias] = useState(0);
  const [prevWarnIntermedios, setPrevWarnIntermedios] = useState(0);
  const [prevWarnGraves, setPrevWarnGraves] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [criticalCase, setCriticalCase] = useState(false);
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

  const levelText = useMemo(() => sanctionLevelLabel(sancion), [sancion]);
  const categoriasText = useMemo(
    () => (categorias.length > 0 ? categorias.join(" / ") : "-"),
    [categorias]
  );
  const dateIsValid = useMemo(() => isValidDateFormat(fecha), [fecha]);
  const pcuLinkIsValid = useMemo(
    () => /^https?:\/\//i.test(supportPcuLink.trim()),
    [supportPcuLink]
  );

  const currentInfractions = useMemo(
    () => policyInfractions[policyCategory] ?? [],
    [policyCategory]
  );

  const recommendedSanction = useMemo(
    () => suggestedSanction(sancion, prevAdvertencias, prevWarnIntermedios, prevWarnGraves, criticalCase),
    [sancion, prevAdvertencias, prevWarnIntermedios, prevWarnGraves, criticalCase]
  );
  const previewFinalSanction = useMemo(
    () => recommendedSanction,
    [recommendedSanction]
  );
  const previewFinalLevel = useMemo(
    () => sanctionLevelLabel(previewFinalSanction),
    [previewFinalSanction]
  );
  const previewAccentColor = useMemo(
    () => sanctionAccentColor(previewFinalSanction),
    [previewFinalSanction]
  );
  const adminMentionPreview = useMemo(
    () => formatDiscordMention(adminDiscordId, adminSanciona),
    [adminDiscordId, adminSanciona]
  );
  const supportMentionPreview = useMemo(
    () => formatDiscordMention(supportDiscordId, supportSancionado),
    [supportDiscordId, supportSancionado]
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
    if (!supportSancionado.trim()) missing.push("Support sancionado");
    if (!supportPcuLink.trim()) missing.push("Link de PCU");
    if (!adminSanciona.trim()) missing.push("Admin que sanciona");
    if (!motivo.trim()) missing.push("Motivo");
    if (!sancion.trim()) missing.push("Sancion");

    return missing;
  }, [fecha, supportSancionado, supportPcuLink, adminSanciona, motivo, sancion]);

  const accumulationNote = useMemo(() => {
    const totalIntermedios =
      prevWarnIntermedios + (sancion === "Warn Intermedio" ? 1 : 0);

    if (criticalCase && sancion === "Warn Grave") {
      return "Warn Grave marcado como falta critica: se recomienda Remocion directa.";
    }

    if (sancion === "Warn Grave" && (prevWarnGraves > 0 || prevWarnIntermedios > 0)) {
      return "Warn Grave con antecedentes: evaluar Suspension o Remocion segun gravedad.";
    }

    if (totalIntermedios >= 3) {
      return "Acumulacion de 3 Warn Intermedios: corresponde Remocion del staff.";
    }

    if (totalIntermedios >= 2) {
      return "Acumulacion de 2 Warn Intermedios: corresponde evaluacion inmediata del puesto.";
    }

    if (sancion === "Advertencia" && prevAdvertencias >= 1) {
      return "Acumulacion de 2 Advertencias: corresponde elevar a Warn Intermedio.";
    }

    if (totalIntermedios === 1) {
      return "Warn Intermedio aplicado: corresponde seguimiento del desempeño.";
    }

    return "Sin escalamiento automatico por acumulacion en este registro.";
  }, [criticalCase, prevAdvertencias, prevWarnIntermedios, prevWarnGraves, sancion]);

  const previewDescription = useMemo(() => {
    return {
      adminBlock: [
        `### Fecha:\n${formatInputDateToSanctionDate(fecha) || "(DD/MM/AA)"}`,
        `### Datos del Admin que sanciona:`,
        `* Trainer/Admin que sanciona: ${adminMentionPreview} (${adminSanciona || "-"})`,
      ].join("\n"),
      supportBlock: [
        `### Datos del Support:`,
        `* Support Sancionado: ${supportMentionPreview} (${supportSancionado || "-"})`,
        `* Link de PCU: ${supportPcuLink || "-"}`,
      ].join("\n"),
      motivoBlock: `**Motivo:**\n${motivo || "(Explicacion clara de lo ocurrido)"}`,
      evalFields: [
        { name: "Bloque evaluacion", value: policyCategory || "-" },
        { name: "Falta", value: policyFault || "-" },
        { name: "Categorias", value: categoriasText },
      ],
      pruebasBlock: `**Pruebas:**\n${pruebas || "-"}`,
      sanctionFields: [
        { name: "Sancion solicitada", value: `${sancion} (${levelText})` },
        { name: "Sancion final aplicada", value: `${previewFinalSanction} (${previewFinalLevel})` },
      ],
      accumulationFields: [
        { name: "Advertencias previas", value: String(prevAdvertencias) },
        { name: "Warn Intermedios previos", value: String(prevWarnIntermedios) },
        { name: "Warn Graves previos", value: String(prevWarnGraves) },
      ],
      accumulationNoteText: accumulationNote,
      observacionesBlock: `**Observaciones:**\n${observaciones || "-"}`,
    };
  }, [
    fecha,
    adminMentionPreview,
    adminSanciona,
    supportMentionPreview,
    supportSancionado,
    supportPcuLink,
    motivo,
    policyCategory,
    policyFault,
    categoriasText,
    pruebas,
    sancion,
    levelText,
    previewFinalSanction,
    previewFinalLevel,
    prevAdvertencias,
    prevWarnIntermedios,
    prevWarnGraves,
    accumulationNote,
    observaciones,
  ]);

  useEffect(() => {
    const adminFromSession =
      session?.user?.name?.trim() || session?.user?.email?.trim() || "";
    const adminDiscordFromSession = session?.user?.discordUserId?.trim() || "";

    if (!adminSanciona.trim() && adminFromSession) {
      setAdminSanciona(adminFromSession);
    }

    if (!adminDiscordId && adminDiscordFromSession) {
      setAdminDiscordId(adminDiscordFromSession);
    }
  }, [session?.user?.name, session?.user?.email, session?.user?.discordUserId, adminSanciona, adminDiscordId]);

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
        setSupportSancionado((currentSelection) =>
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

  useEffect(() => {
    let active = true;

    async function loadSanctionHistory() {
      if (!/^\d{17,20}$/.test(supportDiscordId)) {
        setPrevAdvertencias(0);
        setPrevWarnIntermedios(0);
        setPrevWarnGraves(0);
        return;
      }

      setHistoryLoading(true);

      try {
        const response = await fetch(
          `/api/discord/sanctions?supportDiscordId=${encodeURIComponent(supportDiscordId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar el historial de sanciones");
        }

        const data = await parseJsonSafe<{
          counts?: {
            advertencias?: number;
            warnIntermedios?: number;
            warnGraves?: number;
          };
        }>(response);

        if (!active) {
          return;
        }

        setPrevAdvertencias(data?.counts?.advertencias ?? 0);
        setPrevWarnIntermedios(data?.counts?.warnIntermedios ?? 0);
        setPrevWarnGraves(data?.counts?.warnGraves ?? 0);
      } catch {
        if (!active) {
          return;
        }

        setPrevAdvertencias(0);
        setPrevWarnIntermedios(0);
        setPrevWarnGraves(0);
      } finally {
        if (active) {
          setHistoryLoading(false);
        }
      }
    }

    void loadSanctionHistory();

    return () => {
      active = false;
    };
  }, [supportDiscordId]);

  function selectPolicyCategory(category: string) {
    setPolicyCategory(category);
    const firstInfraction = policyInfractions[category]?.[0];

    if (!firstInfraction) {
      setPolicyFault("");
      return;
    }

    setPolicyFault(firstInfraction.fault);
    setSancion(firstInfraction.sanction);

    if (firstInfraction.tags.length > 0) {
      setCategorias(firstInfraction.tags);
    }

    if (!motivo.trim()) {
      setMotivo(
        buildMotivoTemplate(
          supportSancionado,
          category,
          firstInfraction.fault,
          firstInfraction.sanction,
          sanctionLevelLabel(firstInfraction.sanction),
          pruebas
        )
      );
    }
  }

  function selectInfraction(fault: string) {
    setPolicyFault(fault);
    const infraction = currentInfractions.find((item) => item.fault === fault);

    if (!infraction) {
      return;
    }

    setSancion(infraction.sanction);

    if (infraction.tags.length > 0) {
      setCategorias(infraction.tags);
    }

    if (!motivo.trim()) {
      setMotivo(
        buildMotivoTemplate(
          supportSancionado,
          policyCategory,
          fault,
          infraction.sanction,
          sanctionLevelLabel(infraction.sanction),
          pruebas
        )
      );
    }
  }

  async function copyPreview() {
    const previewText = [
      "## Registro de sanción:",
      "### Fecha:",
      formatInputDateToSanctionDate(fecha) || "(DD/MM/AA)",
      "",
      "### Administrador que sanciona:",
      `* Administrador que sanciona: ${adminSanciona || "-"}`,
      "",
      "### Datos del Support:",
      `* Support sancionado: ${supportSancionado || "-"}`,
      `* Link de PCU: ${supportPcuLink || "-"}`,
      "",
      "**Motivo:**",
      motivo || "(Explicacion clara de lo ocurrido)",
      "",
      "**Tabla de evaluación:**",
      `Bloque: ${policyCategory || "-"}`,
      `Falta: ${policyFault || "-"}`,
      "",
      "**Categoría (Puede elegir una o varias según aplique):**",
      categoriasText,
      "",
      "**Evidencia:**",
      pruebas || "-",
      "",
      "**Sanción:**",
      `${sancion} (${levelText})`,
      criticalCase ? "Caso crítico: SI" : "Caso crítico: NO",
      "",
      "**Acumulación:**",
      `Advertencias previas: ${prevAdvertencias}`,
      `Advertencias intermedias previas: ${prevWarnIntermedios}`,
      `Advertencias graves previas: ${prevWarnGraves}`,
      accumulationNote,
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

  async function publishSanction(event: FormEvent<HTMLFormElement>) {
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
      const response = await fetch("/api/discord/sanctions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fecha: formatInputDateToSanctionDate(fecha),
          supportSancionado,
          supportDiscordId,
          supportPcuLink: supportPcuLink.trim(),
          adminSanciona,
          adminDiscordId,
          motivo,
          policyCategory,
          policyFault,
          categorias,
          pruebas,
          sancion,
          criticalCase,
          observaciones,
        }),
      });

      const data = await parseJsonSafe<{ ok?: boolean; error?: string }>(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "No se pudo registrar la sanción");
      }

      const result = data as {
        finalSanction?: string;
        finalLevel?: string;
        counts?: {
          advertencias?: number;
          warnIntermedios?: number;
          warnGraves?: number;
        };
      };

      if (result.finalSanction) {
        setSancion(result.finalSanction);
      }

      setPrevAdvertencias(result.counts?.advertencias ?? 0);
      setPrevWarnIntermedios(result.counts?.warnIntermedios ?? 0);
      setPrevWarnGraves(result.counts?.warnGraves ?? 0);

      setPublish({
        loading: false,
        error: null,
        success: result.finalSanction
          ? `Sanción registrada en BD y enviada a Discord. Sanción final: ${result.finalSanction}${
              result.finalLevel ? ` (${result.finalLevel})` : ""
            }.`
          : "Sanción registrada en BD y enviada a Discord.",
      });

      setPruebas("");
      setObservaciones("");
      setSupportSancionado("");
      setSupportDiscordId("");
      setSupportPcuLink("");
      setMotivo("");
      setCriticalCase(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setPublish({ loading: false, error: message, success: null });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <UICard className="xl:col-span-7 p-6">
        <div className="mb-8 flex items-start gap-3">
          <div className="mt-1 grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-accent-red)]/35 bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-neutral-grey)]">Discord</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--color-neutral-white)]">Registrar Sanción</h2>
            <p className="mt-2 text-sm text-[var(--color-neutral-grey)]">
              Completa solo los campos esenciales. El resto se genera automáticamente.
            </p>
          </div>
        </div>

        <form onSubmit={publishSanction} className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Fecha</span>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
              />
              {!dateIsValid ? (
                <p className="mt-1 text-xs text-[var(--color-accent-red)]">Selecciona una fecha valida.</p>
              ) : null}
            </label>
          </div>

          {/* Support Selection - Primary Section */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Support a sancionar</span>
              <select
                value={supportDiscordId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setSupportDiscordId(selectedId);

                  const selectedSupport = supportOptions.find(
                    (support) => support.id === selectedId
                  );
                  setSupportSancionado(selectedSupport?.displayName ?? "");
                }}
                required
                className={selectClassName}
                style={{ colorScheme: "dark" }}
                disabled={supportOptionsLoading || supportOptions.length === 0}
              >
                <option value="" className={optionClassName}>
                  {supportOptionsLoading ? "Cargando supports..." : "Selecciona un support"}
                </option>
                {supportOptions.map((support) => (
                  <option key={support.id} value={support.id} className={optionClassName}>
                    {support.displayName}
                  </option>
                ))}
              </select>
              {supportOptionsError ? (
                <p className="mt-2 text-xs text-[var(--color-accent-red)]">{supportOptionsError}</p>
              ) : null}
              {!supportOptionsLoading && supportOptions.length === 0 && !supportOptionsError ? (
                <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
                  No se encontraron miembros con rol Support.
                </p>
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
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                placeholder="https://pcu-es.gta.world/view/user/xxxx"
              />
              {!pcuLinkIsValid ? (
                <p className="mt-1 text-xs text-[var(--color-accent-red)]">Debe empezar con http:// o https://</p>
              ) : null}
            </label>
          </div>

          {/* Infraction Type - Quick Selection */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Tipo de falta</span>
              <select
                value={policyCategory}
                onChange={(e) => selectPolicyCategory(e.target.value)}
                className={selectClassName}
                style={{ colorScheme: "dark" }}
              >
                {Object.keys(policyInfractions).map((category) => (
                  <option key={category} value={category} className={optionClassName}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Falta específica</span>
              <select
                value={policyFault}
                onChange={(e) => selectInfraction(e.target.value)}
                className={selectClassName}
                style={{ colorScheme: "dark" }}
              >
                {currentInfractions.map((infraction) => (
                  <option key={infraction.fault} value={infraction.fault} className={optionClassName}>
                    {infraction.fault}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Description - Core Field */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">¿Qué sucedió?</span>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                required
                className="min-h-24 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                placeholder="Describe brevemente el incidente: qué pasó, cuándo y por qué."
              />
              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
                Sé conciso y objetivo. Incluye hechos verificables e impacto.
              </p>
            </label>
          </div>

          {/* Evidence */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Evidencia (opcional)</span>
              <textarea
                value={pruebas}
                onChange={(e) => setPruebas(e.target.value)}
                className="min-h-16 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm outline-none transition-all focus:border-[#ffac00]/40"
                placeholder="Links, clips, capturas de pantalla, mensajes..."
              />
              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">
                Agrega links o referencias que respalden el caso.
              </p>
            </label>
          </div>

          {/* Sanction Selection */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-neutral-white)]">Sanción propuesta</span>
              <select
                value={sancion}
                onChange={(e) => setSancion(e.target.value)}
                className={selectClassName}
                style={{ colorScheme: "dark" }}
              >
                {sanctionOptions.map((option) => (
                  <option key={option} value={option} className={optionClassName}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[var(--color-neutral-grey)]">Nivel: {levelText}</p>
              {recommendedSanction !== sancion ? (
                <button
                  type="button"
                  onClick={() => setSancion(recommendedSanction)}
                  className="mt-2 rounded-lg border border-[var(--color-accent-orange)]/40 bg-[var(--color-accent-orange)]/12 px-3 py-2 text-xs text-[var(--color-accent-orange)]"
                >
                  Sugerencia: {recommendedSanction}
                </button>
              ) : null}

              <label className="mt-4 flex items-center gap-2 text-xs text-[var(--color-neutral-grey)]">
                <input
                  type="checkbox"
                  checked={criticalCase}
                  onChange={(e) => setCriticalCase(e.target.checked)}
                  className="h-4 w-4 rounded border border-white/[0.2] bg-white/[0.04]"
                />
                Marcar como falta crítica (permite escalar Warn Grave a Remoción)
              </label>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={publish.loading || missingRequired.length > 0 || !dateIsValid || !pcuLinkIsValid}
            className="w-full rounded-xl border border-[var(--color-accent-red)]/45 bg-[var(--color-accent-red)]/14 px-4 py-3 text-sm font-medium text-[var(--color-neutral-white)] transition-all duration-200 hover:bg-[var(--color-accent-red)]/24 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="mb-0.5 mr-2 inline h-4 w-4" />
            {publish.loading ? "Registrando..." : "Registrar sanción"}
          </button>

          {/* Messages */}
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
            <div className="rounded-lg border border-[var(--color-accent-green)]/20 bg-[var(--color-accent-green)]/8 p-3 text-xs text-[var(--color-accent-green)]">
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
        {copyStatus ? <p className="mb-4 text-xs text-[var(--color-accent-green)]">✓ {copyStatus}</p> : null}
        
        <div className="space-y-4">
          {/* Current Selection Summary */}
          {supportSancionado && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Support</p>
              <p className="text-sm font-semibold text-[var(--color-neutral-white)]">{supportSancionado}</p>
            </div>
          )}

          {motivo && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Lo ocurrido</p>
              <p className="text-xs text-[var(--color-neutral-grey)] leading-relaxed">{motivo.slice(0, 150)}{motivo.length > 150 ? "..." : ""}</p>
            </div>
          )}

          {/* Sanction Summary */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-3">Sanción propuesta</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--color-neutral-white)]">{sancion}</span>
              <span className="text-xs rounded-lg px-3 py-1.5" style={{ color: sanctionAccentColor(sancion), backgroundColor: `${sanctionAccentColor(sancion)}20` }}>
                {levelText}
              </span>
            </div>
          </div>

          {/* Final Sanction (if different) */}
          {previewFinalSanction !== sancion && (
            <div className="rounded-xl border border-[var(--color-accent-orange)]/30 bg-[var(--color-accent-orange)]/8 p-4">
              <p className="text-xs uppercase text-[var(--color-accent-orange)] mb-2 font-medium">Sanción Final</p>
              <span className="text-sm font-semibold rounded-lg px-3 py-1.5" style={{ color: sanctionAccentColor(previewFinalSanction), backgroundColor: `${sanctionAccentColor(previewFinalSanction)}20` }}>
                {previewFinalSanction} ({previewFinalLevel})
              </span>
            </div>
          )}

          {/* Categorías */}
          {categorias.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Categorías</p>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map(cat => (
                  <span key={cat} className="text-xs rounded-md border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)] px-2 py-1">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Indicator */}
          {pruebas && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-xs uppercase text-[var(--color-neutral-grey)] mb-2">Evidencia</p>
              <p className="text-xs text-[var(--color-neutral-grey)]">✓ Añadida ({pruebas.length} caracteres)</p>
            </div>
          )}
        </div>

        {/* Discord Preview (Old Style - More Compact) */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#2b2d31] p-0 overflow-hidden">
          {/* Bot identity */}
          <div className="p-4 border-b border-white/[0.06] bg-[#1e1f22] flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-full bg-[#5865f2] text-[7px] font-bold text-white">
              SM
            </div>
            <span className="text-sm font-semibold text-[#f2f3f5]">Support Management</span>
            <span className="rounded bg-[#5865f2] px-1 py-0.5 text-[10px] font-medium text-white">BOT</span>
            <span className="text-xs text-[#949ba4]">Ahora</span>
          </div>

          {/* Content above (mentions) */}
          {previewMentionsText && (
            <p className="mb-3 text-sm text-[#dbdee1]">{previewMentionsText}</p>
          )}

          {/* Container with accent color */}
          <div
            className="overflow-hidden"
            style={{ background: "#1e1f22", borderLeft: `3px solid ${previewAccentColor}` }}
          >
            <div className="p-4 space-y-3">
              {/* Title */}
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: previewAccentColor }} />
                <h3 className="text-base font-bold text-[#f2f3f5]">Registro de Sanción</h3>
              </div>

              {/* Sanction highlight */}
              <div className="rounded bg-[#2b2d31] border-l-4 p-3" style={{ borderColor: previewAccentColor }}>
                <p className="text-xs font-semibold text-[#949ba4]">Sanción final</p>
                <p className="text-sm font-bold text-[#f2f3f5]">{previewFinalSanction} ({previewFinalLevel})</p>
              </div>

              {/* Info Section */}
              {supportSancionado && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">**Support:** {supportSancionado}</p>
                </>
              )}

              {motivo && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1]"><strong>Motivo:</strong></p>
                  <p className="text-sm text-[#dbdee1] whitespace-pre-wrap">{motivo}</p>
                </>
              )}

              {pruebas && (
                <>
                  <div className="border-t border-white/[0.15]" />
                  <p className="text-sm text-[#dbdee1]"><strong>Evidencia:</strong></p>
                  <p className="text-sm text-[#dbdee1]">{pruebas}</p>
                </>
              )}

              {/* Footer */}
              <div className="border-t border-white/[0.15]" />
              <p className="text-[11px] text-[#949ba4]">Generado por Support Management</p>
            </div>
          </div>
        </div>
      </UICard>
    </div>
  );
}

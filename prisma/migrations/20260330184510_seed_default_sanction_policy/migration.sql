WITH category_seed(seed_id, name, sort_order) AS (
  VALUES
    ('spc_conducta_actitud', 'Conducta y actitud', 1),
    ('spc_conducta_staff', 'Conducta dentro del equipo de staff', 2),
    ('spc_roleplay', 'Comportamiento en Roleplay', 3),
    ('spc_herramientas', 'Uso de herramientas administrativas', 4),
    ('spc_criterio', 'Gestion de situaciones y criterio', 5),
    ('spc_actividad', 'Actividad e inactividad', 6),
    ('spc_ausencias', 'Sistema de ausencias', 7),
    ('spc_tickets', 'Calidad en la gestion de tickets', 8),
    ('spc_comunicacion', 'Profesionalismo en la comunicacion escrita', 9),
    ('spc_tiempo', 'Gestion del tiempo y priorizacion', 10),
    ('spc_confidencialidad', 'Uso de informacion y confidencialidad', 11),
    ('spc_offduty', 'Conducta fuera de servicio (Off-Duty)', 12),
    ('spc_compromiso', 'Compromiso y mejora continua', 13)
)
INSERT INTO "SanctionPolicyCategory" (
  "id",
  "name",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  seed_id,
  name,
  sort_order,
  true,
  NOW(),
  NOW()
FROM category_seed
ON CONFLICT ("name") DO UPDATE
SET
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = NOW();

WITH infraction_seed(seed_id, category_name, fault, sanction, tags, sort_order) AS (
  VALUES
    ('spi_conducta_01', 'Conducta y actitud', 'Responder de forma agresiva, cortante o poco profesional', 'Warn Intermedio', ARRAY['Conducta', 'Staff']::text[], 1),
    ('spi_conducta_02', 'Conducta y actitud', 'Falta de respeto hacia usuarios', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 2),
    ('spi_conducta_03', 'Conducta y actitud', 'Falta de respeto hacia miembros del staff', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 3),
    ('spi_conducta_04', 'Conducta y actitud', 'Actitud toxica o provocadora', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 4),
    ('spi_conducta_05', 'Conducta y actitud', 'Generar discusiones innecesarias con usuarios', 'Warn Intermedio', ARRAY['Conducta']::text[], 5),
    ('spi_conducta_06', 'Conducta y actitud', 'Uso de sarcasmo o burlas hacia usuarios', 'Warn Grave', ARRAY['Conducta']::text[], 6),
    ('spi_conducta_07', 'Conducta y actitud', 'Actitud de superioridad frente a la comunidad', 'Warn Grave', ARRAY['Conducta']::text[], 7),
    ('spi_conducta_08', 'Conducta y actitud', 'Desacreditar decisiones del staff publicamente', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 8),

    ('spi_staff_01', 'Conducta dentro del equipo de staff', 'No aceptar feedback o correcciones', 'Warn Intermedio', ARRAY['Staff', 'Criterio']::text[], 1),
    ('spi_staff_02', 'Conducta dentro del equipo de staff', 'Actitud defensiva o conflictiva ante feedback', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 2),
    ('spi_staff_03', 'Conducta dentro del equipo de staff', 'Ignorar indicaciones de Support Trainers o Support Lead', 'Warn Grave', ARRAY['Staff', 'Criterio']::text[], 3),
    ('spi_staff_04', 'Conducta dentro del equipo de staff', 'Discutir decisiones administrativas de forma inapropiada', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 4),
    ('spi_staff_05', 'Conducta dentro del equipo de staff', 'Generar mal ambiente dentro del equipo', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 5),

    ('spi_rp_01', 'Comportamiento en Roleplay', 'Incumplir normas del servidor en RP', 'Warn Grave', ARRAY['RP']::text[], 1),
    ('spi_rp_02', 'Comportamiento en Roleplay', 'No dar ejemplo dentro del roleplay', 'Warn Intermedio', ARRAY['RP']::text[], 2),
    ('spi_rp_03', 'Comportamiento en Roleplay', 'Realizar acciones antirol siendo staff', 'Warn Grave', ARRAY['RP']::text[], 3),
    ('spi_rp_04', 'Comportamiento en Roleplay', 'Arruinar o interrumpir situaciones de roleplay', 'Warn Grave', ARRAY['RP']::text[], 4),
    ('spi_rp_05', 'Comportamiento en Roleplay', 'Uso de informacion OOC (Metagaming)', 'Remocion', ARRAY['RP', 'Criterio']::text[], 5),
    ('spi_rp_06', 'Comportamiento en Roleplay', 'Forzar situaciones de rol injustificadamente', 'Warn Grave', ARRAY['RP']::text[], 6),
    ('spi_rp_07', 'Comportamiento en Roleplay', 'Intervenir como staff sin justificacion', 'Warn Grave', ARRAY['RP', 'Criterio']::text[], 7),
    ('spi_rp_08', 'Comportamiento en Roleplay', 'Uso del rol de staff para intimidar jugadores', 'Remocion', ARRAY['RP', 'Staff']::text[], 8),

    ('spi_cmd_01', 'Uso de herramientas administrativas', 'Uso incorrecto de comandos o herramientas', 'Advertencia', ARRAY['Comandos']::text[], 1),
    ('spi_cmd_02', 'Uso de herramientas administrativas', 'Uso con beneficio propio', 'Warn Grave', ARRAY['Comandos', 'Criterio']::text[], 2),
    ('spi_cmd_03', 'Uso de herramientas administrativas', 'Uso para evadir sanciones propias', 'Suspension', ARRAY['Comandos', 'Staff']::text[], 3),
    ('spi_cmd_04', 'Uso de herramientas administrativas', 'Abuso de poderes de staff', 'Remocion', ARRAY['Comandos', 'Criterio', 'Staff']::text[], 4),

    ('spi_criterio_01', 'Gestion de situaciones y criterio', 'Resolver tickets sin revisar correctamente', 'Advertencia', ARRAY['Criterio', 'Actividad']::text[], 1),
    ('spi_criterio_02', 'Gestion de situaciones y criterio', 'Tomar decisiones sin notificar', 'Warn Grave', ARRAY['Criterio', 'Staff']::text[], 2),
    ('spi_criterio_03', 'Gestion de situaciones y criterio', 'Ignorar reportes o tickets', 'Advertencia', ARRAY['Criterio', 'Actividad']::text[], 3),
    ('spi_criterio_04', 'Gestion de situaciones y criterio', 'Favorecer a conocidos o amigos', 'Warn Grave', ARRAY['Criterio', 'Staff']::text[], 4),
    ('spi_criterio_05', 'Gestion de situaciones y criterio', 'Intervenir innecesariamente en situaciones', 'Warn Intermedio', ARRAY['Criterio']::text[], 5),

    ('spi_actividad_01', 'Actividad e inactividad', 'Baja actividad sin justificacion', 'Advertencia', ARRAY['Actividad']::text[], 1),
    ('spi_actividad_02', 'Actividad e inactividad', 'No atender tickets estando disponible', 'Advertencia', ARRAY['Actividad']::text[], 2),
    ('spi_actividad_03', 'Actividad e inactividad', 'Ignorar tickets de forma reiterada', 'Warn Intermedio', ARRAY['Actividad']::text[], 3),
    ('spi_actividad_04', 'Actividad e inactividad', 'Conectarse sin ejercer funciones de soporte', 'Warn Intermedio', ARRAY['Actividad']::text[], 4),
    ('spi_actividad_05', 'Actividad e inactividad', 'Inactividad prolongada sin aviso', 'Remocion', ARRAY['Actividad']::text[], 5),

    ('spi_ausencias_01', 'Sistema de ausencias', 'Ausencia menor a 3 dias sin aviso', 'Advertencia', ARRAY['Ausencias', 'Actividad']::text[], 1),
    ('spi_ausencias_02', 'Sistema de ausencias', 'Ausencia mayor a 5 dias sin aviso', 'Warn Intermedio', ARRAY['Ausencias', 'Actividad']::text[], 2),
    ('spi_ausencias_03', 'Sistema de ausencias', 'Ausencia prolongada sin comunicacion', 'Remocion', ARRAY['Ausencias', 'Actividad']::text[], 3),

    ('spi_tickets_01', 'Calidad en la gestion de tickets', 'Atender tickets de forma superficial o incompleta', 'Advertencia', ARRAY['Tickets', 'Criterio']::text[], 1),
    ('spi_tickets_02', 'Calidad en la gestion de tickets', 'Priorizar cantidad de tickets sobre calidad de atencion (ticket farming)', 'Warn Intermedio', ARRAY['Tickets', 'Actividad']::text[], 2),
    ('spi_tickets_03', 'Calidad en la gestion de tickets', 'Cerrar tickets sin resolucion clara o sin confirmacion del usuario', 'Advertencia', ARRAY['Tickets', 'Criterio']::text[], 3),
    ('spi_tickets_04', 'Calidad en la gestion de tickets', 'Proporcionar informacion incorrecta por falta de verificacion', 'Warn Intermedio', ARRAY['Tickets', 'Criterio']::text[], 4),
    ('spi_tickets_05', 'Calidad en la gestion de tickets', 'Abandonar tickets sin justificacion tras haberlos tomado', 'Warn Intermedio', ARRAY['Tickets', 'Actividad']::text[], 5),

    ('spi_com_01', 'Profesionalismo en la comunicacion escrita', 'Uso excesivo de abreviaturas o lenguaje informal inapropiado', 'Advertencia', ARRAY['Comunicacion', 'Conducta']::text[], 1),
    ('spi_com_02', 'Profesionalismo en la comunicacion escrita', 'Respuestas ambiguas o poco claras en resoluciones', 'Warn Intermedio', ARRAY['Comunicacion', 'Criterio']::text[], 2),

    ('spi_tiempo_01', 'Gestion del tiempo y priorizacion', 'Retener tickets sin gestionarlos activamente', 'Warn Intermedio', ARRAY['Tiempo', 'Tickets']::text[], 1),
    ('spi_tiempo_02', 'Gestion del tiempo y priorizacion', 'No escalar situaciones que superan su criterio o permisos', 'Warn Grave', ARRAY['Tiempo', 'Criterio']::text[], 2),
    ('spi_tiempo_03', 'Gestion del tiempo y priorizacion', 'Interrumpir la gestion de otro staff sin coordinacion', 'Warn Intermedio', ARRAY['Tiempo', 'Staff']::text[], 3),

    ('spi_conf_01', 'Uso de informacion y confidencialidad', 'Compartir informacion interna del staff con usuarios', 'Warn Grave + Suspension', ARRAY['Confidencialidad', 'Staff']::text[], 1),
    ('spi_conf_02', 'Uso de informacion y confidencialidad', 'Filtrar decisiones administrativas o discusiones internas', 'Warn Grave + Suspension', ARRAY['Confidencialidad', 'Staff']::text[], 2),
    ('spi_conf_03', 'Uso de informacion y confidencialidad', 'Uso indebido de informacion obtenida en tickets', 'Warn Grave', ARRAY['Confidencialidad', 'Tickets']::text[], 3),
    ('spi_conf_04', 'Uso de informacion y confidencialidad', 'Divulgar datos sensibles de jugadores o staff', 'Remocion', ARRAY['Confidencialidad', 'Staff']::text[], 4),

    ('spi_off_01', 'Conducta fuera de servicio (Off-Duty)', 'Mantener conductas toxicas identificables como staff fuera de servicio', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 1),
    ('spi_off_02', 'Conducta fuera de servicio (Off-Duty)', 'Danar la reputacion del servidor en espacios externos', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 2),
    ('spi_off_03', 'Conducta fuera de servicio (Off-Duty)', 'Uso del rol de staff como argumento en discusiones externas', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 3),

    ('spi_comp_01', 'Compromiso y mejora continua', 'No mostrar intencion de mejora tras multiples correcciones', 'Warn Grave', ARRAY['Compromiso', 'Staff']::text[], 1),
    ('spi_comp_02', 'Compromiso y mejora continua', 'Reincidir en errores previamente senalados', 'Escalamiento de sancion', ARRAY['Compromiso', 'Criterio']::text[], 2),
    ('spi_comp_03', 'Compromiso y mejora continua', 'Falta de participacion en reuniones, feedback, etc', 'Advertencia', ARRAY['Compromiso', 'Staff']::text[], 3),
    ('spi_comp_04', 'Compromiso y mejora continua', 'Desinteres evidente en el rol de soporte', 'Evaluacion del puesto', ARRAY['Compromiso', 'Actividad']::text[], 4)
),
existing AS (
  SELECT
    i."id",
    c."name" AS category_name,
    i."fault"
  FROM "SanctionPolicyInfraction" i
  JOIN "SanctionPolicyCategory" c ON c."id" = i."categoryId"
)
UPDATE "SanctionPolicyInfraction" i
SET
  "sanction" = s.sanction,
  "tags" = s.tags,
  "sortOrder" = s.sort_order,
  "isActive" = true,
  "updatedAt" = NOW()
FROM infraction_seed s
JOIN "SanctionPolicyCategory" c ON c."name" = s.category_name
WHERE i."categoryId" = c."id"
  AND i."fault" = s.fault;

WITH infraction_seed(seed_id, category_name, fault, sanction, tags, sort_order) AS (
  VALUES
    ('spi_conducta_01', 'Conducta y actitud', 'Responder de forma agresiva, cortante o poco profesional', 'Warn Intermedio', ARRAY['Conducta', 'Staff']::text[], 1),
    ('spi_conducta_02', 'Conducta y actitud', 'Falta de respeto hacia usuarios', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 2),
    ('spi_conducta_03', 'Conducta y actitud', 'Falta de respeto hacia miembros del staff', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 3),
    ('spi_conducta_04', 'Conducta y actitud', 'Actitud toxica o provocadora', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 4),
    ('spi_conducta_05', 'Conducta y actitud', 'Generar discusiones innecesarias con usuarios', 'Warn Intermedio', ARRAY['Conducta']::text[], 5),
    ('spi_conducta_06', 'Conducta y actitud', 'Uso de sarcasmo o burlas hacia usuarios', 'Warn Grave', ARRAY['Conducta']::text[], 6),
    ('spi_conducta_07', 'Conducta y actitud', 'Actitud de superioridad frente a la comunidad', 'Warn Grave', ARRAY['Conducta']::text[], 7),
    ('spi_conducta_08', 'Conducta y actitud', 'Desacreditar decisiones del staff publicamente', 'Warn Grave', ARRAY['Conducta', 'Staff']::text[], 8),
    ('spi_staff_01', 'Conducta dentro del equipo de staff', 'No aceptar feedback o correcciones', 'Warn Intermedio', ARRAY['Staff', 'Criterio']::text[], 1),
    ('spi_staff_02', 'Conducta dentro del equipo de staff', 'Actitud defensiva o conflictiva ante feedback', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 2),
    ('spi_staff_03', 'Conducta dentro del equipo de staff', 'Ignorar indicaciones de Support Trainers o Support Lead', 'Warn Grave', ARRAY['Staff', 'Criterio']::text[], 3),
    ('spi_staff_04', 'Conducta dentro del equipo de staff', 'Discutir decisiones administrativas de forma inapropiada', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 4),
    ('spi_staff_05', 'Conducta dentro del equipo de staff', 'Generar mal ambiente dentro del equipo', 'Warn Grave', ARRAY['Staff', 'Conducta']::text[], 5),
    ('spi_rp_01', 'Comportamiento en Roleplay', 'Incumplir normas del servidor en RP', 'Warn Grave', ARRAY['RP']::text[], 1),
    ('spi_rp_02', 'Comportamiento en Roleplay', 'No dar ejemplo dentro del roleplay', 'Warn Intermedio', ARRAY['RP']::text[], 2),
    ('spi_rp_03', 'Comportamiento en Roleplay', 'Realizar acciones antirol siendo staff', 'Warn Grave', ARRAY['RP']::text[], 3),
    ('spi_rp_04', 'Comportamiento en Roleplay', 'Arruinar o interrumpir situaciones de roleplay', 'Warn Grave', ARRAY['RP']::text[], 4),
    ('spi_rp_05', 'Comportamiento en Roleplay', 'Uso de informacion OOC (Metagaming)', 'Remocion', ARRAY['RP', 'Criterio']::text[], 5),
    ('spi_rp_06', 'Comportamiento en Roleplay', 'Forzar situaciones de rol injustificadamente', 'Warn Grave', ARRAY['RP']::text[], 6),
    ('spi_rp_07', 'Comportamiento en Roleplay', 'Intervenir como staff sin justificacion', 'Warn Grave', ARRAY['RP', 'Criterio']::text[], 7),
    ('spi_rp_08', 'Comportamiento en Roleplay', 'Uso del rol de staff para intimidar jugadores', 'Remocion', ARRAY['RP', 'Staff']::text[], 8),
    ('spi_cmd_01', 'Uso de herramientas administrativas', 'Uso incorrecto de comandos o herramientas', 'Advertencia', ARRAY['Comandos']::text[], 1),
    ('spi_cmd_02', 'Uso de herramientas administrativas', 'Uso con beneficio propio', 'Warn Grave', ARRAY['Comandos', 'Criterio']::text[], 2),
    ('spi_cmd_03', 'Uso de herramientas administrativas', 'Uso para evadir sanciones propias', 'Suspension', ARRAY['Comandos', 'Staff']::text[], 3),
    ('spi_cmd_04', 'Uso de herramientas administrativas', 'Abuso de poderes de staff', 'Remocion', ARRAY['Comandos', 'Criterio', 'Staff']::text[], 4),
    ('spi_criterio_01', 'Gestion de situaciones y criterio', 'Resolver tickets sin revisar correctamente', 'Advertencia', ARRAY['Criterio', 'Actividad']::text[], 1),
    ('spi_criterio_02', 'Gestion de situaciones y criterio', 'Tomar decisiones sin notificar', 'Warn Grave', ARRAY['Criterio', 'Staff']::text[], 2),
    ('spi_criterio_03', 'Gestion de situaciones y criterio', 'Ignorar reportes o tickets', 'Advertencia', ARRAY['Criterio', 'Actividad']::text[], 3),
    ('spi_criterio_04', 'Gestion de situaciones y criterio', 'Favorecer a conocidos o amigos', 'Warn Grave', ARRAY['Criterio', 'Staff']::text[], 4),
    ('spi_criterio_05', 'Gestion de situaciones y criterio', 'Intervenir innecesariamente en situaciones', 'Warn Intermedio', ARRAY['Criterio']::text[], 5),
    ('spi_actividad_01', 'Actividad e inactividad', 'Baja actividad sin justificacion', 'Advertencia', ARRAY['Actividad']::text[], 1),
    ('spi_actividad_02', 'Actividad e inactividad', 'No atender tickets estando disponible', 'Advertencia', ARRAY['Actividad']::text[], 2),
    ('spi_actividad_03', 'Actividad e inactividad', 'Ignorar tickets de forma reiterada', 'Warn Intermedio', ARRAY['Actividad']::text[], 3),
    ('spi_actividad_04', 'Actividad e inactividad', 'Conectarse sin ejercer funciones de soporte', 'Warn Intermedio', ARRAY['Actividad']::text[], 4),
    ('spi_actividad_05', 'Actividad e inactividad', 'Inactividad prolongada sin aviso', 'Remocion', ARRAY['Actividad']::text[], 5),
    ('spi_ausencias_01', 'Sistema de ausencias', 'Ausencia menor a 3 dias sin aviso', 'Advertencia', ARRAY['Ausencias', 'Actividad']::text[], 1),
    ('spi_ausencias_02', 'Sistema de ausencias', 'Ausencia mayor a 5 dias sin aviso', 'Warn Intermedio', ARRAY['Ausencias', 'Actividad']::text[], 2),
    ('spi_ausencias_03', 'Sistema de ausencias', 'Ausencia prolongada sin comunicacion', 'Remocion', ARRAY['Ausencias', 'Actividad']::text[], 3),
    ('spi_tickets_01', 'Calidad en la gestion de tickets', 'Atender tickets de forma superficial o incompleta', 'Advertencia', ARRAY['Tickets', 'Criterio']::text[], 1),
    ('spi_tickets_02', 'Calidad en la gestion de tickets', 'Priorizar cantidad de tickets sobre calidad de atencion (ticket farming)', 'Warn Intermedio', ARRAY['Tickets', 'Actividad']::text[], 2),
    ('spi_tickets_03', 'Calidad en la gestion de tickets', 'Cerrar tickets sin resolucion clara o sin confirmacion del usuario', 'Advertencia', ARRAY['Tickets', 'Criterio']::text[], 3),
    ('spi_tickets_04', 'Calidad en la gestion de tickets', 'Proporcionar informacion incorrecta por falta de verificacion', 'Warn Intermedio', ARRAY['Tickets', 'Criterio']::text[], 4),
    ('spi_tickets_05', 'Calidad en la gestion de tickets', 'Abandonar tickets sin justificacion tras haberlos tomado', 'Warn Intermedio', ARRAY['Tickets', 'Actividad']::text[], 5),
    ('spi_com_01', 'Profesionalismo en la comunicacion escrita', 'Uso excesivo de abreviaturas o lenguaje informal inapropiado', 'Advertencia', ARRAY['Comunicacion', 'Conducta']::text[], 1),
    ('spi_com_02', 'Profesionalismo en la comunicacion escrita', 'Respuestas ambiguas o poco claras en resoluciones', 'Warn Intermedio', ARRAY['Comunicacion', 'Criterio']::text[], 2),
    ('spi_tiempo_01', 'Gestion del tiempo y priorizacion', 'Retener tickets sin gestionarlos activamente', 'Warn Intermedio', ARRAY['Tiempo', 'Tickets']::text[], 1),
    ('spi_tiempo_02', 'Gestion del tiempo y priorizacion', 'No escalar situaciones que superan su criterio o permisos', 'Warn Grave', ARRAY['Tiempo', 'Criterio']::text[], 2),
    ('spi_tiempo_03', 'Gestion del tiempo y priorizacion', 'Interrumpir la gestion de otro staff sin coordinacion', 'Warn Intermedio', ARRAY['Tiempo', 'Staff']::text[], 3),
    ('spi_conf_01', 'Uso de informacion y confidencialidad', 'Compartir informacion interna del staff con usuarios', 'Warn Grave + Suspension', ARRAY['Confidencialidad', 'Staff']::text[], 1),
    ('spi_conf_02', 'Uso de informacion y confidencialidad', 'Filtrar decisiones administrativas o discusiones internas', 'Warn Grave + Suspension', ARRAY['Confidencialidad', 'Staff']::text[], 2),
    ('spi_conf_03', 'Uso de informacion y confidencialidad', 'Uso indebido de informacion obtenida en tickets', 'Warn Grave', ARRAY['Confidencialidad', 'Tickets']::text[], 3),
    ('spi_conf_04', 'Uso de informacion y confidencialidad', 'Divulgar datos sensibles de jugadores o staff', 'Remocion', ARRAY['Confidencialidad', 'Staff']::text[], 4),
    ('spi_off_01', 'Conducta fuera de servicio (Off-Duty)', 'Mantener conductas toxicas identificables como staff fuera de servicio', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 1),
    ('spi_off_02', 'Conducta fuera de servicio (Off-Duty)', 'Danar la reputacion del servidor en espacios externos', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 2),
    ('spi_off_03', 'Conducta fuera de servicio (Off-Duty)', 'Uso del rol de staff como argumento en discusiones externas', 'Remocion', ARRAY['OffDuty', 'Conducta']::text[], 3),
    ('spi_comp_01', 'Compromiso y mejora continua', 'No mostrar intencion de mejora tras multiples correcciones', 'Warn Grave', ARRAY['Compromiso', 'Staff']::text[], 1),
    ('spi_comp_02', 'Compromiso y mejora continua', 'Reincidir en errores previamente senalados', 'Escalamiento de sancion', ARRAY['Compromiso', 'Criterio']::text[], 2),
    ('spi_comp_03', 'Compromiso y mejora continua', 'Falta de participacion en reuniones, feedback, etc', 'Advertencia', ARRAY['Compromiso', 'Staff']::text[], 3),
    ('spi_comp_04', 'Compromiso y mejora continua', 'Desinteres evidente en el rol de soporte', 'Evaluacion del puesto', ARRAY['Compromiso', 'Actividad']::text[], 4)
)
INSERT INTO "SanctionPolicyInfraction" (
  "id",
  "categoryId",
  "fault",
  "sanction",
  "tags",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  s.seed_id,
  c."id",
  s.fault,
  s.sanction,
  s.tags,
  s.sort_order,
  true,
  NOW(),
  NOW()
FROM infraction_seed s
JOIN "SanctionPolicyCategory" c ON c."name" = s.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM "SanctionPolicyInfraction" i
  WHERE i."categoryId" = c."id"
    AND i."fault" = s.fault
);

import React from "react";
import {
  Home, Car, Keyboard, User, DollarSign, Building,
  Users, Bug, HelpCircle, Folder, Shield, Wrench,
  MessageSquare, Heart, Star, Globe, Tag, Package,
  AlertTriangle, Zap,
} from "lucide-react";

export type IconComponent = React.ComponentType<{ className?: string }>;

// All available icons for category management
export const AVAILABLE_ICONS: { value: string; label: string; Icon: IconComponent }[] = [
  { value: "fa-home", label: "Casa", Icon: Home },
  { value: "fa-car", label: "Vehículo", Icon: Car },
  { value: "fa-keyboard", label: "Teclado", Icon: Keyboard },
  { value: "fa-user", label: "Usuario", Icon: User },
  { value: "fa-dollar-sign", label: "Dinero", Icon: DollarSign },
  { value: "fa-building", label: "Edificio", Icon: Building },
  { value: "fa-users", label: "Grupo", Icon: Users },
  { value: "fa-bug", label: "Bug", Icon: Bug },
  { value: "fa-question-circle", label: "Pregunta", Icon: HelpCircle },
  { value: "fa-folder", label: "Carpeta", Icon: Folder },
  { value: "fa-shield", label: "Escudo", Icon: Shield },
  { value: "fa-wrench", label: "Herramienta", Icon: Wrench },
  { value: "fa-message", label: "Mensaje", Icon: MessageSquare },
  { value: "fa-heart", label: "Corazón", Icon: Heart },
  { value: "fa-star", label: "Estrella", Icon: Star },
  { value: "fa-globe", label: "Mundo", Icon: Globe },
  { value: "fa-tag", label: "Etiqueta", Icon: Tag },
  { value: "fa-package", label: "Paquete", Icon: Package },
  { value: "fa-alert", label: "Alerta", Icon: AlertTriangle },
  { value: "fa-zap", label: "Rayo", Icon: Zap },
];

const iconMap: Record<string, IconComponent> = {};
for (const entry of AVAILABLE_ICONS) {
  iconMap[entry.value] = entry.Icon;
}

// Emoji fallbacks
const emojiMap: Record<string, IconComponent> = {
  "🏠": Home,
  "🚗": Car,
  "⌨️": Keyboard,
  "👤": User,
  "💰": DollarSign,
  "🏢": Building,
  "👥": Users,
  "🐛": Bug,
  "❓": HelpCircle,
  "📋": Folder,
};

export function getIconComponent(iconName: string): IconComponent {
  return iconMap[iconName] ?? emojiMap[iconName] ?? Folder;
}

// Predefined color palette for category management
export const CATEGORY_COLORS = [
  "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#ef4444", "#f97316", "#dc2626", "#6b7280",
  "#ec4899", "#14b8a6", "#84cc16", "#a855f7",
];

import type { StatutTable, TableServiceState } from "@resto-plus/types";

export const tableStatuts: Record<string, StatutTable> = {};
export const tablePositions: Record<string, { x: number; y: number }> = {};
export const tableInfos: Record<string, { nom?: string; capacite?: number }> = {};
export const tableServices: Record<string, TableServiceState> = {};
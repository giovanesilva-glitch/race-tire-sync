export const TIRE_STATUS = ["estoque", "piloto", "cup", "descartado", "dsi"] as const;
export type TireStatus = typeof TIRE_STATUS[number];

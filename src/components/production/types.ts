export interface Maquina {
  id: number | string;
  nome?: string;
  status?: string;
  [key: string]: unknown;
}

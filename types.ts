export enum TicketStatus {
  WAITING = 'WAITING',
  CALLING = 'CALLING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW'
}

export enum Priority {
  NORMAL = 'Normal',
  ELDERLY = 'Idoso',
  PREGNANT = 'Gestante',
  PCD = 'PCD'
}

export enum ServiceType {
  PRIMEIRA_VEZ = 'Primeira vez',
  INCLUSAO = 'Inclusão',
  ALTERACAO = 'Alteração',
  ATUALIZACAO = 'Atualização'
}

export interface Ticket {
  id: string;
  number: string; // e.g., A-012
  name: string;
  cpf?: string;
  service: string; // Changed from ServiceType enum to string to support dynamic services
  priority: Priority;
  status: TicketStatus;
  createdAt: number; // timestamp
  calledAt?: number;
  startedAt?: number;
  finishedAt?: number;
  attendantName?: string;
  observations?: string;
  recallCount: number;
}

export interface TicketDB {
  id: string;
  number: string;
  name: string;
  cpf: string | null;
  service: string;
  priority: string;
  status: string;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  attendant_name: string | null;
  observations: string | null;
  recall_count: number;
}

export interface User {
  username: string;
  name: string;
  role: 'RECEPTION' | 'ATTENDANT' | 'MANAGER' | 'ADMIN';
  avatarUrl: string;
}

export interface AppSettings {
  agencyName: string;
}
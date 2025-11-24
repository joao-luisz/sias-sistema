import { Ticket, TicketStatus, Priority, ServiceType } from '../types';

export const generateTicketNumber = (service: ServiceType, dailyCount: number): string => {
    const prefix = service.charAt(0).toUpperCase();
    return `${prefix}-${(dailyCount + 1).toString().padStart(3, '0')}`;
};

export const sortTickets = (tickets: Ticket[]): Ticket[] => {
    // 1. Apenas status WAITING
    const waiting = tickets.filter(t => t.status === TicketStatus.WAITING);

    // 2. Separar Prioridades e Normais
    const priorities = waiting.filter(t => t.priority !== Priority.NORMAL);
    const normal = waiting.filter(t => t.priority === Priority.NORMAL);

    // 3. Ordenar ambos por horário de chegada (FIFO)
    priorities.sort((a, b) => a.createdAt - b.createdAt);
    normal.sort((a, b) => a.createdAt - b.createdAt);

    // 4. Retorna lista ordenada: Prioridades primeiro, depois Normais
    return [...priorities, ...normal];
};

export const getNextTicket = (tickets: Ticket[]): Ticket | null => {
    const sorted = sortTickets(tickets);
    return sorted.length > 0 ? sorted[0] : null;
};

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Ticket, TicketStatus, ServiceType, Priority, TicketDB } from '../types';
import { supabase } from './supabase';
import { useToast } from './ToastContext';

interface QueueContextType {
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'number' | 'status' | 'createdAt' | 'recallCount'>) => Ticket;
  callNextTicket: (attendantName: string, specificId?: string) => Ticket | null;
  startService: (id: string) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  recallTicket: (id: string) => void;
  cancelTicket: (id: string) => void;
  markAsNoShow: (id: string) => void;
  takeoverTicket: (id: string, attendantName: string) => void;
  stats: {
    waiting: number;
    inProgress: number;
    finished: number;
    todayTotal: number;
  };
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { addToast } = useToast();

  // Mapper: DB -> App
  const mapTicket = (t: TicketDB): Ticket => ({
    id: t.id,
    number: t.number,
    name: t.name,
    cpf: t.cpf || undefined,
    service: t.service, // Now string
    priority: t.priority as Priority,
    status: t.status as TicketStatus,
    createdAt: new Date(t.created_at).getTime(),
    calledAt: t.called_at ? new Date(t.called_at).getTime() : undefined,
    startedAt: t.started_at ? new Date(t.started_at).getTime() : undefined,
    finishedAt: t.finished_at ? new Date(t.finished_at).getTime() : undefined,
    attendantName: t.attendant_name || undefined,
    observations: t.observations || undefined,
    recallCount: t.recall_count || 0
  });

  // Fetch inicial e Realtime Subscription
  useEffect(() => {
    const fetchTickets = async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching tickets:', error);
        addToast('Erro ao carregar senhas.', 'error');
        return;
      }

      if (data) {
        setTickets(data.map(mapTicket));
      }
    };

    fetchTickets();

    const channel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets(prev => [...prev, mapTicket(payload.new as TicketDB)]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets(prev => prev.map(t => t.id === payload.new.id ? mapTicket(payload.new as TicketDB) : t));
        } else if (payload.eventType === 'DELETE') {
          setTickets(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateTicketNumber = async (service: string) => {
    // Busca contagem do dia no banco para garantir unicidade
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`);

    if (error) throw error;

    const prefix = service.charAt(0).toUpperCase();
    const nextNum = (count || 0) + 1;
    return `${prefix}-${nextNum.toString().padStart(3, '0')}`;
  };

  const addTicket = async (data: Omit<Ticket, 'id' | 'number' | 'status' | 'createdAt' | 'recallCount'>) => {
    try {
      const number = await generateTicketNumber(data.service);

      const newTicket = {
        number,
        name: data.name,
        cpf: data.cpf,
        service: data.service,
        priority: data.priority,
        status: TicketStatus.WAITING,
        observations: data.observations
      };

      const { data: created, error } = await supabase
        .from('tickets')
        .insert(newTicket)
        .select()
        .single();

      if (error) throw error;
      return mapTicket(created);
    } catch (e) {
      console.error("Error adding ticket", e);
      addToast('Erro ao gerar senha.', 'error');
      throw e;
    }
  };

  const callNextTicket = async (attendantName: string, specificId?: string) => {
    let ticketToCall: Ticket | undefined;

    if (specificId) {
      ticketToCall = tickets.find(t => t.id === specificId);
    } else {
      // Lógica de fila local (já que temos a lista atualizada em tempo real)
      // Idealmente poderia ser uma RPC no banco, mas aqui funciona bem
      const waiting = tickets.filter(t => t.status === TicketStatus.WAITING);
      const priorities = waiting.filter(t => t.priority !== Priority.NORMAL);
      const normal = waiting.filter(t => t.priority === Priority.NORMAL);

      priorities.sort((a, b) => a.createdAt - b.createdAt);
      normal.sort((a, b) => a.createdAt - b.createdAt);

      ticketToCall = priorities.length > 0 ? priorities[0] : normal[0];
    }

    if (ticketToCall) {
      // Tenta atualizar com verificação de status para evitar race condition
      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: TicketStatus.CALLING,
          attendant_name: attendantName,
          called_at: new Date().toISOString(),
          recall_count: (ticketToCall.recallCount || 0) + 1
        })
        .eq('id', ticketToCall.id)
        .eq('status', TicketStatus.WAITING) // Garante que ainda está esperando
        .select()
        .single();

      if (error || !data) {
        // Se falhar (alguém pegou antes ou erro), tenta recursivamente o próximo
        // Mas para evitar loop infinito, verificamos se foi erro de "nenhuma linha afetada" (race condition)
        if (!data && !error) {
          // Race condition: alguém pegou. Tenta chamar de novo (vai pegar o próximo da fila)
          // Pequeno delay para dar tempo do realtime atualizar a lista local
          await new Promise(r => setTimeout(r, 200));
          return callNextTicket(attendantName);
        }

        addToast('Erro ao chamar senha. Tente novamente.', 'error');
        return null;
      }
      return mapTicket(data);
    }
    return null;
  };

  const startService = async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: TicketStatus.IN_PROGRESS,
        started_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) addToast('Erro ao iniciar atendimento.', 'error');
  };

  const updateTicketStatus = async (id: string, status: TicketStatus) => {
    const updateData: any = { status };
    if (status === TicketStatus.FINISHED) {
      updateData.finished_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', id);

    if (error) addToast('Erro ao atualizar status.', 'error');
  };

  const recallTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    const { error } = await supabase
      .from('tickets')
      .update({
        called_at: new Date().toISOString(),
        recall_count: (ticket.recallCount || 0) + 1
      })
      .eq('id', id);

    if (error) addToast('Erro ao rechamar senha.', 'error');
  };

  const cancelTicket = async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: TicketStatus.CANCELED,
        finished_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) addToast('Erro ao cancelar senha.', 'error');
  };

  const markAsNoShow = async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        status: TicketStatus.NO_SHOW,
        finished_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) addToast('Erro ao marcar como ausente.', 'error');
  };

  const takeoverTicket = async (id: string, attendantName: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({
        attendant_name: attendantName
      })
      .eq('id', id);

    if (error) addToast('Erro ao assumir atendimento.', 'error');
    else addToast('Atendimento assumido com sucesso!', 'success');
  };

  const stats = {
    waiting: tickets.filter(t => t.status === TicketStatus.WAITING).length,
    inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLING).length,
    finished: tickets.filter(t => t.status === TicketStatus.FINISHED && t.createdAt > new Date().setHours(0, 0, 0, 0)).length,
    todayTotal: tickets.filter(t => t.createdAt > new Date().setHours(0, 0, 0, 0)).length
  };

  return (
    <QueueContext.Provider value={{ tickets, addTicket: addTicket as any, callNextTicket, startService, updateTicketStatus, recallTicket, cancelTicket, markAsNoShow, takeoverTicket, stats }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within a QueueProvider');
  return context;
};
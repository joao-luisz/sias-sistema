import React, { useState, useEffect } from 'react';
import { useQueue } from '../services/QueueContext';
import { useToast } from '../services/ToastContext';
import { useAuth } from '../services/AuthContext';
import { Ticket, TicketStatus, Priority } from '../types';

// Timer Component outside to preserve state
const formatTimeElapsed = (timestamp: number) => {
    if (!timestamp) return "00:00";
    const diff = Date.now() - timestamp;
    if (diff < 0) return "00:00"; // Prevent negative time
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Timer: React.FC<{ start: number }> = ({ start }) => {
    const [time, setTime] = useState(formatTimeElapsed(start));
    useEffect(() => {
        setTime(formatTimeElapsed(start)); // Initial set
        const interval = setInterval(() => setTime(formatTimeElapsed(start)), 1000);
        return () => clearInterval(interval);
    }, [start]);
    return <span>{time}</span>
};

const Attendant: React.FC = () => {
    const { tickets, callNextTicket, startService, updateTicketStatus, recallTicket, markAsNoShow, takeoverTicket } = useQueue();
    const { addToast } = useToast();
    const { user } = useAuth();
    const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
    const attendantName = user?.name || "Atendente";

    // Check if the attendant has an active ticket on load or when tickets change
    useEffect(() => {
        // Look for tickets assigned to this attendant that are CALLING or IN_PROGRESS
        const active = tickets.find(t =>
            (t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLING)
            && t.attendantName === attendantName
        );

        // Update local state if we found one
        if (active) {
            // Only update if ID changed or status changed to prevent re-renders loops if shallow equal
            setCurrentTicket(prev => {
                if (!prev || prev.id !== active.id || prev.status !== active.status || prev.recallCount !== active.recallCount) {
                    return active;
                }
                return prev;
            });
        } else {
            // If context says no active ticket, clear local state
            setCurrentTicket(prev => {
                if (prev && prev.status !== TicketStatus.FINISHED && prev.status !== TicketStatus.CANCELED && prev.status !== TicketStatus.NO_SHOW) {
                    return null;
                }
                return prev; // Keep showing finished state locally until user dismisses or starts new
            });
        }
    }, [tickets, attendantName]);

    const handleNext = async () => {
        const ticket = await callNextTicket(attendantName);
        if (!ticket) {
            addToast("Não há ninguém na fila!", 'info');
        } else {
            addToast(`Chamando senha ${ticket.number}`, 'info');
        }
    };

    const handleStart = () => {
        if (currentTicket) {
            startService(currentTicket.id);
            addToast(`Atendimento iniciado: ${currentTicket.number}`, 'success');
        }
    };

    const handleFinish = () => {
        if (currentTicket) {
            updateTicketStatus(currentTicket.id, TicketStatus.FINISHED);
            addToast(`Atendimento ${currentTicket.number} finalizado.`, 'success');
            setCurrentTicket(null);
        }
    };

    const handleNoShow = () => {
        if (currentTicket) {
            if (confirm(`Marcar ${currentTicket.number} como AUSENTE?`)) {
                markAsNoShow(currentTicket.id);
                addToast(`${currentTicket.number} marcado como ausente.`, 'info');
                setCurrentTicket(null);
            }
        }
    };

    const handleRecall = () => {
        if (currentTicket) {
            recallTicket(currentTicket.id);
            addToast(`Rechamando ${currentTicket.number}...`, 'info');
        }
    };

    const waitingList = tickets
        .filter(t => t.status === TicketStatus.WAITING)
        .sort((a, b) => {
            // Sort by priority first, then time
            const priorityScore = (p: Priority) => p === Priority.NORMAL ? 0 : 1;
            const diffPriority = priorityScore(b.priority) - priorityScore(a.priority);
            if (diffPriority !== 0) return diffPriority;
            return a.createdAt - b.createdAt;
        });

    return (
        <div className="p-8 max-w-7xl mx-auto">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Sala de Atendimento</h1>

                <div className="flex flex-wrap gap-3">
                    {/* Botão de Chamar Próximo: Só aparece se não tiver ninguém sendo atendido ou chamado */}
                    <button
                        onClick={handleNext}
                        disabled={!!currentTicket || waitingList.length === 0}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">play_arrow</span>
                        Chamar Próximo
                    </button>

                    {/* Botões para Status CHAMANDO */}
                    {currentTicket && currentTicket.status === TicketStatus.CALLING && (
                        <>
                            <button
                                onClick={handleRecall}
                                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">campaign</span>
                                Rechamar
                            </button>
                            <button
                                onClick={handleNoShow}
                                className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined">person_off</span>
                                Ausente
                            </button>

                            <button
                                onClick={handleStart}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 animate-pulse"
                            >
                                <span className="material-symbols-outlined">person_check</span>
                                Iniciar
                            </button>
                        </>
                    )}

                    {/* Botão para Status EM ATENDIMENTO */}
                    {currentTicket && currentTicket.status === TicketStatus.IN_PROGRESS && (
                        <button
                            onClick={handleFinish}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined">check_circle</span>
                            Finalizar
                        </button>
                    )}
                </div>
            </div>

            {/* Active Ticket Section */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Status Atual:</h2>
                    {currentTicket ? (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase
                    ${currentTicket.status === TicketStatus.CALLING ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'}
                `}>
                            {currentTicket.status === TicketStatus.CALLING ? 'Chamando Cidadão' : 'Em Atendimento'}
                        </span>
                    ) : (
                        <span className="text-slate-500 dark:text-slate-400">Aguardando início</span>
                    )}
                </div>

                {currentTicket ? (
                    <div className={`bg-white dark:bg-slate-800 border rounded-2xl p-6 shadow-lg flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden transition-colors
             ${currentTicket.status === TicketStatus.CALLING ? 'border-blue-200 dark:border-blue-900 shadow-blue-500/5' : 'border-green-200 dark:border-green-900 shadow-green-500/5'}
           `}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${currentTicket.status === TicketStatus.CALLING ? 'bg-blue-500' : 'bg-green-500'}`}></div>

                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className={`text-4xl font-bold font-mono tracking-tight ${currentTicket.status === TicketStatus.CALLING ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}`}>
                                    {currentTicket.number}
                                </h3>
                                {currentTicket.priority !== Priority.NORMAL && (
                                    <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-amber-200 dark:border-amber-800">
                                        {currentTicket.priority}
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-medium text-slate-900 dark:text-white mb-1">{currentTicket.name}</p>
                            <p className="text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                {currentTicket.service}
                            </p>

                            <div className="grid grid-cols-3 gap-4 mt-6 bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Chegada</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200">
                                        {new Date(currentTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Tempo de Espera</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200">
                                        {Math.floor(((currentTicket.calledAt || Date.now()) - currentTicket.createdAt) / 60000)} min
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold">Chamadas</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                                        {currentTicket.recallCount || 1}x
                                        {(currentTicket.recallCount || 0) > 2 && <span className="text-red-500 material-symbols-outlined text-sm">warning</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between items-end min-w-[200px]">
                            <div className="text-right bg-slate-100 dark:bg-slate-700 p-4 rounded-xl w-full">
                                <p className="text-xs font-bold uppercase text-slate-400 mb-1">
                                    {currentTicket.status === TicketStatus.CALLING ? 'Chamando há' : 'Duração Atend.'}
                                </p>
                                <p className="text-4xl font-mono font-bold text-slate-800 dark:text-white">
                                    <Timer key={`${currentTicket.id}-${currentTicket.status}`} start={currentTicket.status === TicketStatus.CALLING ? (currentTicket.calledAt || Date.now()) : (currentTicket.startedAt || currentTicket.calledAt || Date.now())} />
                                </p>
                            </div>

                            <div className="mt-6 w-full">
                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Observações da Recepção</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 min-h-[60px]">
                                    {currentTicket.observations || "Nenhuma observação."}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 transition-colors">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">person_off</span>
                        <p className="text-lg font-medium">Nenhum atendimento em andamento.</p>
                        <p className="text-sm">Clique em "Chamar Próximo" para chamar alguém da fila.</p>
                    </div>
                )}
            </div>

            {/* Other Active Tickets (Rescue/Visibility) */}
            {tickets.some(t => (t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLING) && t.attendantName !== attendantName) && (
                <div className="mb-8 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-bold uppercase text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">supervised_user_circle</span>
                        Em atendimento por outros colegas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tickets.filter(t => (t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLING) && t.attendantName !== attendantName).map(t => (
                            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{t.number}</p>
                                    <p className="text-xs text-slate-500">{t.attendantName}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === TicketStatus.CALLING ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {t.status === TicketStatus.CALLING ? 'CHAMANDO' : 'ATENDENDO'}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (confirm(`Deseja assumir o atendimento da senha ${t.number}?`)) {
                                                takeoverTicket(t.id, attendantName);
                                            }
                                        }}
                                        className="text-xs bg-slate-200 hover:bg-blue-100 text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                    >
                                        Assumir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Waiting List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">group</span>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Fila de Espera</h2>
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-sm font-bold">
                            {waitingList.length}
                        </span>
                    </div>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
                    {waitingList.length > 0 ? waitingList.map((ticket, index) => (
                        <div key={ticket.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs">
                                    {index + 1}º
                                </div>
                                <div className="w-20 font-bold font-mono text-lg text-slate-700 dark:text-slate-200">{ticket.number}</div>
                                <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{ticket.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{ticket.service}</p>
                                </div>
                                {ticket.priority !== Priority.NORMAL && (
                                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs rounded-full font-bold uppercase">
                                        {ticket.priority}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-slate-400">Chegada</p>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center flex flex-col items-center text-slate-500 dark:text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">coffee</span>
                            <p>Fila vazia. Bom trabalho!</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Attendant;
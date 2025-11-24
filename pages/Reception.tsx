import React, { useState, useRef } from 'react';
import { useQueue } from '../services/QueueContext';
import { useToast } from '../services/ToastContext';
import { useSettings } from '../services/SettingsContext';
import { Priority, ServiceType, TicketStatus } from '../types';
import { config } from '../config';
import { formatCPF, formatDateTime } from '../utils/formatUtils';
import { exportTicketsToCSV } from '../utils/exportUtils';

const Reception: React.FC = () => {
    const { tickets, addTicket, cancelTicket, stats } = useQueue();
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL');

    const [lastPrintedTicket, setLastPrintedTicket] = useState<{
        number: string;
        name: string;
        service: string;
        priority: string;
        date: string;
    } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        cpf: '',
        service: ServiceType.PRIMEIRA_VEZ as string,
        priority: Priority.NORMAL,
        observations: ''
    });

    const [availableServices, setAvailableServices] = useState<string[]>(Object.values(ServiceType));

    // Fetch dynamic services
    React.useEffect(() => {
        const fetchServices = async () => {
            const { data } = await import('../services/supabase').then(m => m.supabase.from('services').select('name'));
            if (data && data.length > 0) {
                // Merge default and dynamic, removing duplicates
                const dynamicNames = data.map(d => d.name);
                setAvailableServices(Array.from(new Set([...Object.values(ServiceType), ...dynamicNames])));
            }
        };
        fetchServices();
    }, []);

    // Função para máscara de CPF
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = formatCPF(e.target.value);
        setFormData(prev => ({ ...prev, cpf: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // 1. Adicionar Ticket
            const newTicket = await addTicket(formData);

            // 2. Preparar dados para impressão
            setLastPrintedTicket({
                number: newTicket.number,
                name: newTicket.name,
                service: newTicket.service,
                priority: newTicket.priority,
                date: formatDateTime(new Date())
            });

            // 3. Feedback e Limpeza
            addToast(`Ficha ${newTicket.number} gerada com sucesso!`, 'success');
            setIsModalOpen(false);
            setFormData({
                name: '',
                cpf: '',
                service: ServiceType.PRIMEIRA_VEZ,
                priority: Priority.NORMAL,
                observations: ''
            });

            // 4. Disparar impressão após o render do estado
            setTimeout(() => {
                window.print();
            }, 100);
        } catch (e) {
            // Erro já tratado no context
        }
    };

    const handleCancel = (id: string) => {
        if (confirm('Tem certeza que deseja cancelar esta senha?')) {
            cancelTicket(id);
            addToast('Senha cancelada.', 'info');
        }
    };

    // Sort tickets: newest first
    const todaysTickets = tickets
        .filter(t => t.createdAt > new Date().setHours(0, 0, 0, 0))
        .sort((a, b) => b.createdAt - a.createdAt);

    const filteredTickets = todaysTickets.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.number.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* Área de Impressão (Invisível na tela, visível na impressão) */}
            <div className="hidden print:block print:w-[80mm] print:p-2 print:text-black font-sans">
                <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                    <h2 className="text-sm font-bold uppercase">Prefeitura Municipal de</h2>
                    <h1 className="text-lg font-black uppercase">{config.agency.city}</h1>
                    <p className="text-xs mt-1">{config.agency.name}</p>
                </div>
                {lastPrintedTicket && (
                    <div className="text-center">
                        <p className="text-sm uppercase font-bold">Sua Senha</p>
                        <p className="text-6xl font-black my-2 font-mono">{lastPrintedTicket.number}</p>
                        <p className="text-lg font-bold uppercase mb-2 border-2 border-black inline-block px-2 rounded-lg">
                            {lastPrintedTicket.priority !== 'Normal' ? lastPrintedTicket.priority : 'Normal'}
                        </p>

                        <div className="text-left mt-6 border-t border-black pt-4">
                            <p className="text-[10px] font-bold uppercase">Nome do Cidadão:</p>
                            <p className="text-sm mb-2 truncate font-bold">{lastPrintedTicket.name}</p>

                            <p className="text-[10px] font-bold uppercase">Serviço Solicitado:</p>
                            <p className="text-sm mb-2">{lastPrintedTicket.service}</p>

                            <p className="text-[10px] font-bold uppercase">Data/Hora:</p>
                            <p className="text-xs">{lastPrintedTicket.date}</p>
                        </div>
                    </div>
                )}
                <div className="mt-8 text-center text-[10px] border-t border-black pt-2">
                    <p className="font-bold">Aguarde ser chamado pelo painel.</p>
                    <p>Acompanhe sua senha na TV.</p>
                </div>
            </div>

            {/* Interface Normal (Escondida na impressão) */}
            <div className="print:hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Painel da Recepção</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie os atendimentos do dia.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => exportTicketsToCSV(tickets)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors"
                            title="Exportar Relatório CSV"
                        >
                            <span className="material-symbols-outlined">download</span>
                            <span className="hidden sm:inline">Exportar</span>
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-md transition-transform hover:scale-105 active:scale-95"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            Cadastrar Nova Pessoa
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Pessoas Aguardando</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.waiting}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Pessoas em Atendimento</p>
                        <p className="text-4xl font-bold text-yellow-500">{stats.inProgress}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">Finalizados Hoje</p>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.finished}</p>
                    </div>
                </div>

                {/* List Section */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cadastros do Dia</h2>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                <button
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === 'ALL' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => setFilterStatus(TicketStatus.WAITING)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterStatus === TicketStatus.WAITING ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-300'}`}
                                >
                                    Aguardando
                                </button>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Buscar..."
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-colors"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs uppercase font-semibold transition-colors">
                                <tr>
                                    <th className="px-6 py-4">Senha</th>
                                    <th className="px-6 py-4">Nome do Cidadão</th>
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4">Prioridade</th>
                                    <th className="px-6 py-4">Chegada</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{ticket.number}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{ticket.name}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{ticket.service}</td>
                                        <td className="px-6 py-4">
                                            {ticket.priority !== Priority.NORMAL ? (
                                                <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase">{ticket.priority}</span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                                            {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${ticket.status === TicketStatus.WAITING ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                        ${ticket.status === TicketStatus.CALLING ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 animate-pulse' : ''}
                        ${ticket.status === TicketStatus.IN_PROGRESS ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                        ${ticket.status === TicketStatus.FINISHED ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                        ${ticket.status === TicketStatus.CANCELED ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
                        ${ticket.status === TicketStatus.NO_SHOW ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300' : ''}
                        `}>
                                                {ticket.status === TicketStatus.WAITING && 'Aguardando'}
                                                {ticket.status === TicketStatus.CALLING && 'Chamando'}
                                                {ticket.status === TicketStatus.IN_PROGRESS && 'Em Atendimento'}
                                                {ticket.status === TicketStatus.FINISHED && 'Finalizado'}
                                                {ticket.status === TicketStatus.CANCELED && 'Cancelado'}
                                                {ticket.status === TicketStatus.NO_SHOW && 'Ausente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {ticket.status === TicketStatus.WAITING && (
                                                <button
                                                    onClick={() => handleCancel(ticket.id)}
                                                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Cancelar Senha"
                                                >
                                                    <span className="material-symbols-outlined">cancel</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredTickets.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                            Nenhum registro encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl transform transition-all scale-100 border border-slate-200 dark:border-slate-700">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cadastro de Atendimento</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome Completo *</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            placeholder="Digite o nome completo"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">CPF (Opcional)</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            placeholder="000.000.000-00"
                                            value={formData.cpf}
                                            onChange={handleCpfChange}
                                            maxLength={14}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Serviço Desejado *</label>
                                        <select
                                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            value={formData.service}
                                            onChange={e => setFormData({ ...formData, service: e.target.value })}
                                        >
                                            {/* Default Services */}
                                            {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
                                            {/* Dynamic Services could be fetched here, but for now we rely on defaults + admin added ones if we fetch them. 
                                                Since we didn't implement fetching services in Reception yet, let's keep it simple. 
                                                Ideally, we should fetch from 'services' table here too. */}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Prioridade</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {Object.values(Priority).map(p => (
                                                <label key={p} className={`
                            flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                            ${formData.priority === p
                                                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-400'}
                        `}>
                                                    <input
                                                        type="radio"
                                                        name="priority"
                                                        value={p}
                                                        checked={formData.priority === p}
                                                        onChange={() => setFormData({ ...formData, priority: p })}
                                                        className="hidden"
                                                    />
                                                    {p}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Observações</label>
                                        <textarea
                                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            placeholder="Adicione qualquer observação relevante..."
                                            value={formData.observations}
                                            onChange={e => setFormData({ ...formData, observations: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">print</span>
                                        Gerar e Imprimir
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reception;
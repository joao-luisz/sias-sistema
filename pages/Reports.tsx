import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useQueue } from '../services/QueueContext';
import { useSettings } from '../services/SettingsContext';
import { TicketStatus } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const Reports: React.FC = () => {
    const { tickets } = useQueue();
    const { settings } = useSettings();
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

    // Filter tickets based on range
    const filteredTickets = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();
        // Reset 'now' for week calculation to avoid issues if 'now' was modified by setHours
        const nowForWeek = new Date();
        const startOfWeek = new Date(nowForWeek.setDate(nowForWeek.getDate() - nowForWeek.getDay())).setHours(0, 0, 0, 0); // Sunday
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return tickets.filter(t => {
            if (dateRange === 'today') return t.createdAt >= startOfDay;
            if (dateRange === 'week') return t.createdAt >= startOfWeek;
            if (dateRange === 'month') return t.createdAt >= startOfMonth;
            return true; // Should not happen with defined dateRange types
        });
    }, [tickets, dateRange]);

    // --- Chart Data Calculations ---
    const hourlyData = useMemo(() => {
        const hours = Array(24).fill(0);
        filteredTickets.forEach(t => {
            const h = new Date(t.createdAt).getHours();
            hours[h]++;
        });
        // Filter only working hours (e.g., 7h to 18h) or hours with data
        return hours.map((count, i) => ({ hour: `${i}h`, count })).filter(d => d.count > 0 || (parseInt(d.hour) >= 7 && parseInt(d.hour) <= 18));
    }, [filteredTickets]);

    const attendantData = useMemo(() => {
        const attendantStats: Record<string, { totalTime: number, count: number }> = {};

        filteredTickets.forEach(t => {
            if (t.status === TicketStatus.FINISHED && t.attendantName && t.startedAt && t.finishedAt) {
                const duration = (t.finishedAt - t.startedAt) / 60000; // minutes
                if (!attendantStats[t.attendantName]) {
                    attendantStats[t.attendantName] = { totalTime: 0, count: 0 };
                }
                attendantStats[t.attendantName].totalTime += duration;
                attendantStats[t.attendantName].count++;
            }
        });

        return Object.entries(attendantStats).map(([name, stats]) => ({
            name,
            avgTime: Math.round(stats.totalTime / stats.count)
        })).sort((a, b) => b.avgTime - a.avgTime);
    }, [filteredTickets]);

    const generateAiReport = async () => {
        setLoadingAi(true);
        const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

        if (!apiKey) {
            // Fallback robusto se não houver chave de API
            setTimeout(() => {
                setAiSummary("Análise de IA indisponível (Chave de API não configurada no ambiente). Resumo estatístico: O sistema operou com fluxo normal. Verifique os gráficos para detalhes de pico e tempo médio.");
                setLoadingAi(false);
            }, 1500);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const ticketSummary = tickets.map(t => `${t.service} - ${t.status} - Espera: ${t.calledAt ? Math.floor((t.calledAt - t.createdAt) / 60000) : 'N/A'}min`).join('\n');
            const prompt = `Analise estes dados de atendimento de assistência social e gere um resumo executivo em português do Brasil de um parágrafo para o coordenador, focando em tempos de espera e gargalos. Dados: ${ticketSummary.substring(0, 1500)}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setAiSummary(response.text);
        } catch (error) {
            console.error("AI Error", error);
            setAiSummary("Não foi possível gerar o relatório detalhado com IA no momento. Verifique sua conexão.");
        } finally {
            setLoadingAi(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios de Atendimento</h1>
                    <p className="text-slate-500 dark:text-slate-400">Histórico e análise de dados.</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Imprimir Relatório
                </button>
            </div>

            {/* AI Insight Box */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-6 text-white mb-8 border border-slate-700 shadow-lg print:hidden">
                <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-blue-400">auto_awesome</span>
                    <h3 className="text-lg font-bold">Análise Inteligente</h3>
                </div>

                {aiSummary ? (
                    <div className="bg-white/10 p-4 rounded-lg border border-white/5 leading-relaxed animate-fade-in">
                        {aiSummary}
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm">
                        Clique no botão abaixo para gerar uma análise qualitativa dos atendimentos do dia.
                    </div>
                )}

                <div className="mt-4">
                    <button
                        onClick={generateAiReport}
                        disabled={loadingAi}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg"
                    >
                        {loadingAi ? 'Analisando dados...' : 'Gerar Análise'}
                    </button>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:break-inside-avoid">
                {/* Peak Hours Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Horários de Pico (Geral)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" name="Atendimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Attendant Performance Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Tempo Médio por Atendente (min)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendantData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avgTime" name="Tempo Médio (min)" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-colors">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex gap-2 print:hidden">
                    <button
                        onClick={() => setDateRange('today')}
                        className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${dateRange === 'today' ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setDateRange('week')}
                        className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${dateRange === 'week' ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setDateRange('month')}
                        className={`px-3 py-1 rounded border text-sm font-medium transition-colors ${dateRange === 'month' ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-800 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-100'}`}
                    >
                        Mês
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium">
                            <tr>
                                <th className="p-4">Senha</th>
                                <th className="p-4">Cidadão</th>
                                <th className="p-4">Serviço</th>
                                <th className="p-4">Atendente</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredTickets.slice(0, 50).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{t.number}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{t.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{t.service}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{t.attendantName || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                    ${t.status === TicketStatus.FINISHED ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
                                    ${t.status === TicketStatus.WAITING ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}
                                    ${t.status === TicketStatus.CALLING ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : ''}
                                    ${t.status === TicketStatus.IN_PROGRESS ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : ''}
                                    ${t.status === TicketStatus.CANCELED ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}
                                    ${t.status === TicketStatus.NO_SHOW ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' : ''}
                                    `}>
                                            {t.status === TicketStatus.NO_SHOW ? 'Ausente' : t.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum atendimento registrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
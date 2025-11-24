import React from 'react';
import { useQueue } from '../services/QueueContext';
import { useTheme } from '../services/ThemeContext';
import { useSettings } from '../services/SettingsContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { ServiceType, TicketStatus, Priority } from '../types';

const Dashboard: React.FC = () => {
  const { tickets, stats } = useQueue();
  const { theme } = useTheme();
  const { resetData } = useSettings();
  const isDark = theme === 'dark';

  // --- CÁLCULO DE MÉTRICAS REAIS ---

  // 1. Dados para Gráfico de Pizza (Serviços)
  const serviceData = Object.values(ServiceType).map(service => ({
    name: service,
    value: tickets.filter(t => t.service === service && t.createdAt > new Date().setHours(0,0,0,0)).length
  })).filter(d => d.value > 0); // Mostra apenas o que tem dados

  // 2. Dados para Gráfico de Barras (Atendimentos por Hora - Hoje)
  const hourlyData = Array.from({ length: 9 }, (_, i) => {
    const hour = i + 8; // Começa as 08h
    const hourLabel = `${hour.toString().padStart(2, '0')}h`;
    const count = tickets.filter(t => {
      const d = new Date(t.createdAt);
      const isToday = d.setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
      return isToday && new Date(t.createdAt).getHours() === hour;
    }).length;

    return { name: hourLabel, atendimentos: count };
  });

  // 3. Cálculo de Tempos Médios (Baseado no histórico total ou do dia)
  // Filtrar tickets finalizados/chamados hoje para métricas mais relevantes
  const todayTickets = tickets.filter(t => t.createdAt > new Date().setHours(0,0,0,0));
  const finishedTickets = todayTickets.filter(t => t.status === TicketStatus.FINISHED);
  const calledTickets = todayTickets.filter(t => t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.FINISHED || t.status === TicketStatus.CALLING);

  // Tempo Médio de Espera (Chamada - Chegada)
  const totalWaitTime = calledTickets.reduce((acc, t) => acc + ((t.calledAt || 0) - t.createdAt), 0);
  const avgWaitTimeMs = calledTickets.length ? totalWaitTime / calledTickets.length : 0;
  
  // Tempo Médio de Atendimento (Fim - Chamada)
  const totalServiceTime = finishedTickets.reduce((acc, t) => acc + ((t.finishedAt || 0) - (t.calledAt || 0)), 0);
  const avgServiceTimeMs = finishedTickets.length ? totalServiceTime / finishedTickets.length : 0;

  // Formatador de tempo (ms -> mm:ss)
  const formatTime = (ms: number) => {
    if (isNaN(ms) || ms === Infinity || ms === 0) return "0m 0s";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // 4. Prioridades Atendidas (Ou em andamento/finalizadas)
  const prioritiesCount = todayTickets.filter(t => t.priority !== Priority.NORMAL && t.status !== TicketStatus.WAITING).length;
  const prioritiesPercentage = stats.todayTotal > 0 ? ((prioritiesCount / stats.todayTotal) * 100).toFixed(1) : "0.0";

  // 5. Dados para Tabela de Filas em Tempo Real
  const queueTableData = Object.values(ServiceType).map(service => {
    const waitingTickets = tickets.filter(t => t.service === service && t.status === TicketStatus.WAITING);
    // Agrupa CALLING e IN_PROGRESS como ativos
    const activeTickets = tickets.filter(t => t.service === service && (t.status === TicketStatus.IN_PROGRESS || t.status === TicketStatus.CALLING));
    
    // Espera Máxima
    const maxWaitTicket = waitingTickets.reduce((prev, curr) => (prev.createdAt < curr.createdAt ? prev : curr), waitingTickets[0]);
    const maxWaitTime = maxWaitTicket ? Date.now() - maxWaitTicket.createdAt : 0;

    // Status da Fila
    let status: 'Normal' | 'Atenção' | 'Crítico' = 'Normal';
    if (maxWaitTime > 30 * 60000) status = 'Crítico';
    else if (maxWaitTime > 15 * 60000) status = 'Atenção';

    return {
      service,
      waiting: waitingTickets.length,
      active: activeTickets.length,
      maxWait: maxWaitTime,
      status
    };
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard de Coordenação</h1>
            <p className="text-slate-500 dark:text-slate-400 capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
         </div>
         <button 
             onClick={resetData}
             className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
         >
             <span className="material-symbols-outlined text-sm">delete_forever</span>
             Encerrar Expediente (Limpar)
         </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-xl shadow-lg transition-colors">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-400 text-sm font-medium">Total de Atendimentos (Hoje)</p>
                 <p className="text-4xl font-bold mt-2">{stats.todayTotal}</p>
              </div>
              <span className="material-symbols-outlined text-blue-500 bg-slate-800 dark:bg-slate-900 p-2 rounded-lg">support_agent</span>
           </div>
           <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
              Registro em tempo real
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tempo Médio de Espera</p>
                 <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{formatTime(avgWaitTimeMs)}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">hourglass_top</span>
           </div>
           <p className="text-xs text-slate-400 mt-4">
              Meta: &lt; 15m 00s
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tempo Médio de Atendimento</p>
                 <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{formatTime(avgServiceTimeMs)}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">pace</span>
           </div>
           <p className="text-xs text-slate-400 mt-4">
              Média do dia
           </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Prioridades Atendidas</p>
                 <p className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{prioritiesCount}</p>
              </div>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700 p-2 rounded-lg">star</span>
           </div>
           <p className="text-xs text-slate-400 mt-4">
              {prioritiesPercentage}% do total
           </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Fluxo por Hora (Hoje)</h3>
             <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        stroke={isDark ? "#94a3b8" : "#64748b"} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        stroke={isDark ? "#94a3b8" : "#64748b"} 
                        allowDecimals={false}
                      />
                      <Tooltip 
                        cursor={{fill: isDark ? '#1e293b' : '#f1f5f9'}} 
                        contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }}
                      />
                      <Bar dataKey="atendimentos" name="Senhas Geradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
             <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Distribuição por Serviço</h3>
             <div className="h-80">
                {serviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={serviceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={isDark ? "#1e293b" : "#fff"} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#fff' : '#000' }} />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <p>Nenhum dado disponível hoje.</p>
                    </div>
                )}
             </div>
          </div>
      </div>

      {/* Real Time Queue Table */}
      <div className="bg-slate-900 dark:bg-slate-950 rounded-xl shadow-lg overflow-hidden text-white">
         <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold">Filas Atuais (Acompanhamento em Tempo Real)</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Ao vivo
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-slate-400 uppercase font-medium">
                <tr>
                    <th className="p-4">Fila / Serviço</th>
                    <th className="p-4">Aguardando</th>
                    <th className="p-4">Em Atendimento</th>
                    <th className="p-4">Maior Espera</th>
                    <th className="p-4">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                {queueTableData.map((row) => (
                    <tr key={row.service} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-medium">{row.service}</td>
                        <td className="p-4 font-bold text-lg">{row.waiting}</td>
                        <td className="p-4">{row.active}</td>
                        <td className="p-4 text-slate-300 font-mono">{formatTime(row.maxWait)}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase
                                ${row.status === 'Normal' ? 'bg-green-500/20 text-green-400' : ''}
                                ${row.status === 'Atenção' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                                ${row.status === 'Crítico' ? 'bg-red-500/20 text-red-400' : ''}
                            `}>
                                {row.status}
                            </span>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
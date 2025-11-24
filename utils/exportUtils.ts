import { Ticket } from '../types';
import { formatDateTime } from './formatUtils';

export const exportTicketsToCSV = (tickets: Ticket[]) => {
    // Define headers
    const headers = ['Senha', 'Nome', 'CPF', 'Serviço', 'Prioridade', 'Status', 'Chegada', 'Chamada', 'Início', 'Fim', 'Atendente', 'Observações'];

    // Map data
    const rows = tickets.map(t => [
        t.number,
        t.name,
        t.cpf || '',
        t.service,
        t.priority,
        t.status,
        formatDateTime(new Date(t.createdAt)),
        t.calledAt ? formatDateTime(new Date(t.calledAt)) : '',
        t.startedAt ? formatDateTime(new Date(t.startedAt)) : '',
        t.finishedAt ? formatDateTime(new Date(t.finishedAt)) : '',
        t.attendantName || '',
        t.observations || ''
    ]);

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_atendimentos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

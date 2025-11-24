import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCPF = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const formatTime = (timestamp: number | Date): string => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR });
};

export const formatDate = (timestamp: number | Date): string => {
    return format(new Date(timestamp), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};

export const formatDateTime = (timestamp: number | Date): string => {
    return format(new Date(timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR });
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { supabase } from '../services/supabase';

const Admin: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [services, setServices] = useState<any[]>([]);
    const [newService, setNewService] = useState('');
    const [loading, setLoading] = useState(false);

    // Mock users for now since we can't easily list auth users without edge functions
    // In a real app, we would fetch from a 'profiles' table
    const [users, setUsers] = useState([
        { id: '1', email: 'recepcao@sias.com', role: 'RECEPTION', name: 'Recepção' },
        { id: '2', email: 'atendente@sias.com', role: 'ATTENDANT', name: 'Maria Silva' },
        { id: '3', email: 'gerente@sias.com', role: 'MANAGER', name: 'Gerente' },
    ]);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        const { data, error } = await supabase.from('services').select('*').order('created_at');
        if (data) setServices(data);
    };

    const handleAddService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newService.trim()) return;
        setLoading(true);

        const { error } = await supabase.from('services').insert([{ name: newService }]);

        if (error) {
            addToast('Erro ao adicionar serviço.', 'error');
        } else {
            addToast('Serviço adicionado!', 'success');
            setNewService('');
            fetchServices();
        }
        setLoading(false);
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (!error) {
            addToast('Serviço removido.', 'success');
            fetchServices();
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Painel Administrativo</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Gerencie serviços e usuários do sistema.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Services Management */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">category</span>
                        Gerenciar Serviços
                    </h2>

                    <form onSubmit={handleAddService} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newService}
                            onChange={(e) => setNewService(e.target.value)}
                            placeholder="Nome do novo serviço..."
                            className="flex-1 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                        >
                            Adicionar
                        </button>
                    </form>

                    <div className="space-y-2">
                        {services.length === 0 && <p className="text-slate-400 text-sm">Nenhum serviço customizado. (Usando padrões do sistema)</p>}
                        {services.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                                <button
                                    onClick={() => handleDeleteService(s.id)}
                                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Users Management (Mock/Placeholder) */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500">group</span>
                        Equipe (Usuários)
                    </h2>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-lg mb-6">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Nota:</strong> Para adicionar novos usuários, utilize o painel de autenticação do Supabase ou convide-os via email. Esta lista é apenas visualização.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {users.map(u => (
                            <div key={u.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold">
                                    {u.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                                    <p className="text-xs text-slate-500">{u.email}</p>
                                </div>
                                <span className="text-xs font-bold uppercase bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
                                    {u.role}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;

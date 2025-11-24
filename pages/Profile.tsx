import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { useToast } from '../services/ToastContext';
import { supabase } from '../services/supabase';

const Profile: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [name, setName] = useState(user?.name || '');

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Selecione uma imagem para enviar.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.username}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes("Bucket not found")) {
                    throw new Error("Bucket 'avatars' não encontrado. Crie-o no painel do Supabase.");
                }
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update User Metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            addToast('Foto de perfil atualizada!', 'success');

        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            addToast(error.message || 'Erro ao atualizar foto.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { name }
            });

            if (error) throw error;

            addToast('Perfil atualizado com sucesso!', 'success');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            addToast('Erro ao atualizar perfil.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Meu Perfil</h1>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-700 shadow-lg mb-4 overflow-hidden bg-slate-100">
                            {uploading ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                    <span className="material-symbols-outlined animate-spin text-slate-400">refresh</span>
                                </div>
                            ) : (
                                <img src={user?.avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                            )}
                        </div>
                        <label className="absolute bottom-4 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110" title="Alterar foto">
                            <span className="material-symbols-outlined text-lg">photo_camera</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 capitalize">{user?.role.toLowerCase()}</p>
                </div>

                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={user?.username}
                            disabled
                            className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">O email não pode ser alterado.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome Completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;

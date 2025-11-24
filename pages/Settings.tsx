import React, { useState } from 'react';
import { useSettings } from '../services/SettingsContext';
import { useToast } from '../services/ToastContext';

const Settings: React.FC = () => {
  const { settings, updateSettings, resetData } = useSettings();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    agencyName: settings.agencyName,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    addToast('Configurações salvas com sucesso!', 'success');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Configurações do Sistema</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Personalize a identidade.</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
         <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Agency Name */}
            <div>
               <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Nome da Secretaria / Órgão
               </label>
               <input 
                  type="text"
                  value={formData.agencyName}
                  onChange={e => setFormData({...formData, agencyName: e.target.value})}
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Secretaria de Saúde de Uruburetama"
               />
               <p className="text-xs text-slate-500 mt-1">Este nome aparecerá nos relatórios, impressões e no painel da TV.</p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
               <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-all"
               >
                  Salvar Alterações
               </button>
            </div>
         </form>

         {/* Danger Zone */}
         <div className="bg-red-50 dark:bg-red-900/10 p-6 border-t border-red-100 dark:border-red-900/30">
             <h3 className="text-red-600 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                 <span className="material-symbols-outlined">warning</span>
                 Zona de Perigo
             </h3>
             <p className="text-sm text-red-600/70 dark:text-red-400/70 mb-4">
                 Ações aqui são irreversíveis e podem apagar dados locais.
             </p>
             <button 
                onClick={resetData}
                className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
             >
                 Resetar Todos os Dados
             </button>
         </div>
      </div>
    </div>
  );
};

export default Settings;
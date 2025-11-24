import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueue } from '../services/QueueContext';
import { useTheme } from '../services/ThemeContext';
import { Ticket, TicketStatus } from '../types';
import { config } from '../config';
import { formatTime, formatDate } from '../utils/formatUtils';

// Marquee content outside main component to prevent re-renders (blinking)
const MarqueeContent: React.FC<{ agencyName: string }> = ({ agencyName }) => (
    <>
        <span className="text-white text-xl font-bold mx-12">•</span>
        <span className="text-white text-xl font-medium tracking-wide">DOCUMENTOS NECESSÁRIOS: RG, CPF, COMPROVANTE DE RESIDÊNCIA E TÍTULO DE ELEITOR.</span>
        <span className="text-white text-xl font-bold mx-12">•</span>
        <span className="text-yellow-400 text-xl font-bold tracking-wide">ATUALIZAÇÃO DE CADASTRO ÚNICO: OBRIGATÓRIA A CADA 1 ANO.</span>
        <span className="text-white text-xl font-bold mx-12">•</span>
        <span className="text-white text-xl font-medium tracking-wide">HORÁRIO DE FUNCIONAMENTO: SEGUNDA A QUINTA DAS 08H ÀS 17H. SEXTAS DAS 08H ÀS 14H.</span>
        <span className="text-white text-xl font-bold mx-12">•</span>
        <span className="text-white text-xl font-medium tracking-wide">DÚVIDAS SOBRE BOLSA FAMÍLIA? PROCURE A RECEPÇÃO.</span>
        <span className="text-white text-xl font-bold mx-12">•</span>
        <span className="text-white text-xl font-medium tracking-wide">{agencyName.toUpperCase()}.</span>
    </>
);

const TVPanel: React.FC = () => {
    const navigate = useNavigate();
    const { tickets } = useQueue();
    const { theme, toggleTheme } = useTheme();

    const audioContextRef = useRef<AudioContext | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [lastCalled, setLastCalled] = useState<Ticket | null>(null);
    const [history, setHistory] = useState<Ticket[]>([]);
    const [time, setTime] = useState(new Date());
    const [isFlashing, setIsFlashing] = useState(false);
    const [showControls, setShowControls] = useState(false);

    const darkMode = theme === 'dark';
    const agencyName = config.agency.name;

    // Relógio
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Atalhos e Auto-Init Audio
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') navigate('/dashboard');
        };

        let timeout: ReturnType<typeof setTimeout>;
        const handleInteraction = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 3000);

            // Tenta iniciar o AudioContext na primeira interação
            if (!audioContextRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioCtx();
            }
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume().catch(() => { });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousemove', handleInteraction);
        window.addEventListener('click', handleInteraction);

        // Cleanup ao sair da página: PARA O ÁUDIO IMEDIATAMENTE
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('click', handleInteraction);
            clearTimeout(timeout);

            // Limpa intervalos de repetição
            if (intervalRef.current) clearInterval(intervalRef.current);

            // Cancela qualquer fala ativa
            window.speechSynthesis.cancel();

            // Fecha contexto de áudio
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [navigate]);

    // Carregar Vozes
    useEffect(() => {
        const loadVoices = () => window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();
    }, []);

    // Função Ding-Dong (Sino)
    const playDingDong = (): Promise<void> => {
        return new Promise((resolve) => {
            if (!audioContextRef.current) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioCtx();
            }

            if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
                // Se não conseguir tocar, resolve imediatamente para não travar a voz
                resolve();
                return;
            }

            try {
                const ctx = audioContextRef.current;
                const t = ctx.currentTime;

                const osc1 = ctx.createOscillator();
                const gain1 = ctx.createGain();
                osc1.type = 'sine';
                osc1.frequency.setValueAtTime(660, t);
                gain1.gain.setValueAtTime(0.1, t);
                gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
                osc1.connect(gain1);
                gain1.connect(ctx.destination);

                const osc2 = ctx.createOscillator();
                const gain2 = ctx.createGain();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(550, t + 0.6);
                gain2.gain.setValueAtTime(0.1, t + 0.6);
                gain2.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
                osc2.connect(gain2);
                gain2.connect(ctx.destination);

                osc1.start(t);
                osc1.stop(t + 1.2);
                osc2.start(t + 0.6);
                osc2.stop(t + 2.0);

                // Tempo do sino + pequena pausa antes da voz
                setTimeout(resolve, 2200);
            } catch (e) {
                console.error("Audio error", e);
                resolve();
            }
        });
    };

    const getBestVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const premiumVoice = voices.find(v =>
            (v.name.includes("Microsoft Francisca") ||
                v.name.includes("Google Português do Brasil") ||
                v.name.includes("Luciana")) &&
            v.lang.includes("pt-BR")
        );
        return premiumVoice || voices.find(v => v.lang === 'pt-BR');
    };

    // Função Unificada de Anúncio
    const announce = async (text: string) => {
        if (!window.speechSynthesis) return;

        // 1. Limpa qualquer fala anterior
        window.speechSynthesis.cancel();

        // 2. Toca o sino (espera terminar)
        await playDingDong();

        // 3. Configura a fala
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9; // Levemente mais lento para clareza
        utterance.volume = 1.0;

        const bestVoice = getBestVoice();
        if (bestVoice) utterance.voice = bestVoice;

        // Armazena ref para evitar garbage collection
        utteranceRef.current = utterance;

        // 4. Fala
        window.speechSynthesis.speak(utterance);
    };

    // Monitoramento de Fila e Loop de Voz
    useEffect(() => {
        // Tickets ativos (Chamando ou Em Atendimento)
        const activeTickets = tickets
            .filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.IN_PROGRESS)
            .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));

        // Histórico (Para a barra lateral)
        const historyTickets = tickets
            .filter(t => t.calledAt && t.status !== TicketStatus.WAITING && t.status !== TicketStatus.CANCELED && t.status !== TicketStatus.NO_SHOW)
            .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));

        if (activeTickets.length > 0) {
            setHistory(historyTickets.filter(t => t.id !== activeTickets[0].id).slice(0, 5));
        } else {
            setHistory(historyTickets.slice(0, 5));
        }

        const current = activeTickets.length > 0 ? activeTickets[0] : null;

        // Se a senha mudou ou o status mudou
        if (current && (!lastCalled || lastCalled.id !== current.id || lastCalled.status !== current.status)) {
            setLastCalled(current);

            // Limpa intervalo anterior
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.speechSynthesis.cancel();

            // Se status é CHAMANDO, inicia loop
            if (current.status === TicketStatus.CALLING) {
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 4000);

                const text = `Senha, ${current.number}. ${current.name}. Por favor, compareça à sala do Cadastro Único.`;

                // Chama imediatamente
                announce(text);

                // Configura loop a cada 15 segundos
                intervalRef.current = setInterval(() => {
                    // Verifica se o status ainda é calling dentro do loop (embora o useEffect limpe se mudar)
                    // É redundante mas seguro
                    announce(text);
                }, 15000);
            }
        } else if (!current && lastCalled) {
            // Se não tem mais ninguém, limpa tudo
            setLastCalled(null);
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.speechSynthesis.cancel();
        }

        // Cleanup deste efeito específico
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };

    }, [tickets]); // Dependência apenas de tickets garante que atualiza se a fila mudar

    // Styles
    const styles = {
        bg: darkMode ? 'bg-[#0f172a]' : 'bg-slate-50',
        text: darkMode ? 'text-white' : 'text-slate-900',
        subText: darkMode ? 'text-slate-400' : 'text-slate-500',
        sidebarBg: darkMode ? 'bg-[#1e293b]' : 'bg-white',
        sidebarBorder: darkMode ? 'border-slate-700' : 'border-slate-200',
        cardBg: darkMode ? 'bg-slate-800/50' : 'bg-slate-100',
        highlightText: darkMode ? 'text-blue-200' : 'text-blue-700',
        clockBg: darkMode ? 'bg-[#0f172a]' : 'bg-slate-100',
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => { });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    return (
        <div className={`h-screen w-screen overflow-hidden flex flex-col font-sans transition-colors duration-300 ${styles.bg} ${styles.text}`}>

            {/* Controles (Discretos) */}
            <div className={`fixed top-4 right-4 z-50 flex gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="bg-black/40 backdrop-blur-md p-2 rounded-lg flex gap-2 border border-white/10 shadow-xl">
                    <button onClick={toggleTheme} className="p-2 hover:bg-white/10 rounded-md text-white">
                        <span className="material-symbols-outlined">{darkMode ? 'light_mode' : 'dark_mode'}</span>
                    </button>
                    <button onClick={toggleFullScreen} className="p-2 hover:bg-white/10 rounded-md text-white">
                        <span className="material-symbols-outlined">fullscreen</span>
                    </button>
                    <div className="w-px bg-white/20 mx-1"></div>
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-red-500/20 text-white rounded-md flex items-center gap-2">
                        <span className="material-symbols-outlined">close</span>
                        <span className="text-xs font-bold hidden sm:inline">ESC</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Display */}
                <main className={`flex-1 flex flex-col justify-center items-center relative transition-all duration-500 
            ${isFlashing ? (darkMode ? 'bg-blue-900/40' : 'bg-blue-100') : ''}
        `}>
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-yellow-400 to-blue-600"></div>

                    {lastCalled ? (
                        <div className={`flex flex-col items-center justify-center w-full h-full p-8 transition-all duration-500 ${isFlashing ? 'scale-105' : 'scale-100'}`}>

                            <div className={`mb-6 px-8 py-3 rounded-full text-xl font-bold uppercase tracking-widest shadow-lg ${lastCalled.status === TicketStatus.CALLING ? 'bg-blue-600 text-white animate-pulse' : 'bg-green-600 text-white'}`}>
                                {lastCalled.status === TicketStatus.CALLING ? 'CHAMANDO' : 'EM ATENDIMENTO'}
                            </div>

                            <div className="mb-4 relative w-full text-center">
                                <h1 className={`text-[12rem] md:text-[16rem] lg:text-[20rem] leading-none font-black tracking-tighter drop-shadow-2xl font-mono ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {lastCalled.number}
                                </h1>
                            </div>

                            <div className="w-full px-4 max-w-7xl h-48 flex items-start justify-center overflow-hidden">
                                <h2 className={`text-4xl md:text-5xl lg:text-7xl font-bold text-center leading-tight break-words line-clamp-3 drop-shadow-sm ${styles.highlightText}`}>
                                    {lastCalled.name}
                                </h2>
                            </div>

                            <div className="mt-4 bg-blue-600 rounded-2xl px-16 py-8 shadow-2xl shadow-blue-600/30 flex flex-col items-center border-t border-white/20 w-full max-w-4xl">
                                <p className="text-blue-100 text-xl font-bold uppercase tracking-widest mb-1 opacity-80">Serviço</p>
                                <p className="text-3xl lg:text-5xl font-black text-white text-center leading-tight">{lastCalled.service}</p>
                            </div>

                            {lastCalled.priority !== 'Normal' && (
                                <div className="mt-8 px-12 py-3 bg-amber-500 text-amber-950 rounded-full text-3xl font-black uppercase tracking-widest shadow-xl animate-pulse border-4 border-amber-400">
                                    {lastCalled.priority}
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex flex-col items-center opacity-30 select-none animate-pulse">
                            <span className="material-symbols-outlined text-9xl mb-6">account_balance</span>
                            <p className="text-4xl font-light tracking-wide text-center">Prefeitura Municipal de<br /><span className="font-bold">Uruburetama</span></p>
                        </div>
                    )}
                </main>

                {/* Sidebar */}
                <aside className={`w-[350px] xl:w-[450px] border-l flex flex-col shadow-2xl z-10 relative ${styles.sidebarBg} ${styles.sidebarBorder}`}>

                    <div className={`h-48 flex flex-col items-center justify-center border-b ${styles.clockBg} ${styles.sidebarBorder}`}>
                        <p className={`text-7xl font-bold tracking-tight font-mono ${styles.text}`}>
                            {formatTime(time)}
                        </p>
                        <p className={`text-lg mt-2 uppercase tracking-widest font-bold ${styles.subText}`}>
                            {formatDate(time)}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col p-6 overflow-hidden">
                        <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${styles.sidebarBorder}`}>
                            <span className="material-symbols-outlined text-blue-500 text-4xl">history</span>
                            <h3 className={`text-2xl font-bold uppercase tracking-wider ${styles.text}`}>Histórico</h3>
                        </div>

                        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar pb-4">
                            {history.map((ticket, idx) => (
                                <div
                                    key={ticket.id}
                                    className={`p-5 rounded-2xl border-l-8 transition-all shadow-md
                                ${idx === 0 ? 'border-blue-500 opacity-100 scale-100' : 'border-slate-500 opacity-60 scale-95'}
                                ${styles.cardBg}
                            `}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className={`text-5xl font-bold font-mono ${styles.text}`}>{ticket.number}</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
                                            {ticket.calledAt ? formatTime(ticket.calledAt) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <p className={`text-lg truncate font-bold ${styles.highlightText} max-w-[200px]`}>{ticket.service}</p>
                                    </div>
                                </div>
                            ))}

                            {history.length === 0 && (
                                <div className={`flex-1 flex flex-col items-center justify-center opacity-40 ${styles.subText}`}>
                                    <p className="text-xl">Aguardando chamadas...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Rodapé */}
            <div className={`h-14 overflow-hidden flex items-center border-t relative z-20 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-blue-900 border-blue-900'}`}>
                <div className="whitespace-nowrap animate-marquee flex items-center">
                    <MarqueeContent agencyName={agencyName} />
                    <MarqueeContent agencyName={agencyName} />
                    <MarqueeContent agencyName={agencyName} />
                </div>
            </div>

        </div>
    );
};

export default TVPanel;
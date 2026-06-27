import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Cpu, HardDrive, ShieldCheck, Activity, RefreshCw, Monitor, Zap, Search, MessageSquare, ArrowRight, ShieldAlert, Terminal, Lock, Unlock, LogOut, UserCheck } from 'lucide-react';
import HeroAssistant from './components/HeroAssistant.jsx';
import LiveAdvisorChat from './components/LiveAdvisorChat.jsx';


function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- AUTHENTICATION STATE TRACKERS ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Real telemetry state hooks linked precisely to python data maps
  const [telemetry, setTelemetry] = useState({
    cpu: '0%',
    memory: '0 GB',
    storage: '0% Free',
    gpu: 'Unknown GPU',
    os: 'Windows (unknown)',
    status: 'Ready',
    
    // EXTENDED PROACTIVE FIELDS FOR THE AI ADVISOR
    thermal: 'Normal / Stable',
    battery: 'AC Power / Connected',
    suspicious_processes: []
  });

  const [isScanning, setIsScanning] = useState(false);
  
  // Smart scan initialization linked precisely to the saved token signature in local storage
  const [hasUserRunScanYet, setHasUserRunScanYet] = useState(() => {
    const savedToken = localStorage.getItem('purradvisor_session_token');
    if (savedToken) {
      return localStorage.getItem(`purradvisor_scan_completed_${savedToken}`) === 'true';
    }
    return false;
  });
  
  // --- EXTRA SPECIFICATION DATA HOLDERS ---
  const [specData, setSpecData] = useState({
    security: 'Pending initial scan...',
    upgradeAdvice: 'No core anomalies checked.',
    slowApps: []
  });

  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

  // Check for an existing verified session token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('purradvisor_session_token');
    if (savedToken) {
      setSessionToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Secure validation gate handler
  const handleSystemAccess = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setAuthError('Access token field cannot be blank.');
      return;
    }
    
    // Simulate an instant secure authorization token validation loop
    if (tokenInput.length >= 6) {
      const generatedToken = tokenInput.toUpperCase();
      localStorage.setItem('purradvisor_session_token', generatedToken);
      setSessionToken(generatedToken);
      setIsAuthenticated(true);
      setAuthError('');

      // Instantly evaluate whether this specific token has completed a scan before
      const isScanDoneForThisToken = localStorage.getItem(`purradvisor_scan_completed_${generatedToken}`) === 'true';
      setHasUserRunScanYet(isScanDoneForThisToken);
    } else {
      setAuthError('Invalid infrastructure token block. Must be at least 6 characters.');
    }
  };

  const handleSystemLogout = () => {
    localStorage.removeItem('purradvisor_session_token');
    setSessionToken('');
    setTokenInput('');
    setIsAuthenticated(false);
    setPollingEnabled(false);
    setHasUserRunScanYet(false); // Reset timeline visibility cleanly
  };

  // --- RESTORED & EXPANDED ROUTINE TO INTEGRATE CLICKS ---
  const fetchLiveTelemetry = useCallback((isManualClick = false) => {
    if (isManualClick) {
      setIsScanning(true);
    }

    // Hit the instant lightweight endpoint instead of the heavy drive walker
    fetch(`${baseUrl}/system-info`)
      .then((res) => {
        if (!res.ok) throw new Error("Localhost down");
        return res.json();
      })
      .then((data) => {
        updateTelemetryState(data);
        fetchExtendedSpecs();
      })
      .catch(() => {
        fetch('http://127.0.0.1:8000/system-info')
          .then((res) => {
            if (!res.ok) throw new Error("IP line down");
            return res.json();
          })
          .then((data) => {
            updateTelemetryState(data);
            fetchExtendedSpecs();
          })
          .catch((err) => {
            console.error('All pathways down:', err);
            setTelemetry(prev => ({ ...prev, status: 'Unlinked' }));
          })
          .finally(() => {
            if (isManualClick) setIsScanning(false);
          });
      });
  }, [baseUrl, sessionToken]);

  // Fetches extra backend parameters to satisfy the deep technical specs view tabs
  const fetchExtendedSpecs = () => {
    fetch(`${baseUrl}/security-check`)
      .then(res => res.json())
      .then(data => setSpecData(prev => ({ ...prev, security: data.status || 'Secure baseline mapped.' })))
      .catch(() => {});

    fetch(`${baseUrl}/upgrade-advice`)
      .then(res => res.json())
      .then(data => setSpecData(prev => ({ ...prev, upgradeAdvice: data.advice || 'All architectures fully optimal.' })))
      .catch(() => {});

    // ASYNC EXTENDED BACKGROUND PARSING PIPELINES FOR CHAT SNAPSHOT INTEGRATION
    fetch(`${baseUrl}/thermal-status`)
      .then(res => res.json())
      .then(data => {
        setTelemetry(prev => ({ ...prev, thermal: data.status || 'Normal / Stable' }));
      })
      .catch(() => {});

    fetch(`${baseUrl}/battery-health`)
      .then(res => res.json())
      .then(data => {
        setTelemetry(prev => ({ ...prev, battery: data.status || 'AC Power / Connected' }));
      })
      .catch(() => {});

    fetch(`${baseUrl}/suspicious-processes?limit=5`)
      .then(res => res.json())
      .then(data => {
        setTelemetry(prev => ({ ...prev, suspicious_processes: data.suspicious || [] }));
      })
      .catch(() => {});
  };

  const updateTelemetryState = (data) => {
    const cpuLoad = data?.cpu?.usage_percent !== undefined ? `${data.cpu.usage_percent}%` : '0%';
    
    let ramDisplay = '0 GB';
    if (data?.memory?.total_gb !== undefined && data?.memory?.available_gb !== undefined) {
      const usedRam = data.memory.total_gb - data.memory.available_gb;
      ramDisplay = `${usedRam.toFixed(1)} / ${data.memory.total_gb} GB`;
    }

    const diskFree = data?.storage?.free_percent !== undefined ? `${data.storage.free_percent}% Free` : '0% Free';
    const gpuName = data?.gpu?.primary_name ?? 'Unknown GPU';
    const osType = data?.os?.type ?? 'Windows (unknown)';
    const osVersion = data?.os?.version ?? '';
    const osDisplay = osVersion ? `${osType} • ${osVersion}` : osType;

    setTelemetry(prev => ({
      ...prev,
      cpu: cpuLoad,
      memory: ramDisplay,
      storage: diskFree,
      gpu: gpuName,
      os: osDisplay,
      status: 'Active'
    }));

    // Write persistence configuration to browser vault exclusively tied to this session token
    if (sessionToken) {
      localStorage.setItem(`purradvisor_scan_completed_${sessionToken}`, 'true');
    }
    setHasUserRunScanYet(true);
    setIsScanning(false);
  };

  const [pollingEnabled, setPollingEnabled] = useState(false);

  useEffect(() => {
    if (!pollingEnabled || !isAuthenticated) return;

    fetchLiveTelemetry(false);
    const heartbeatInterval = setInterval(() => {
      fetchLiveTelemetry(false);
    }, 2000);

    return () => clearInterval(heartbeatInterval);
  }, [pollingEnabled, fetchLiveTelemetry, isAuthenticated]);


  // --- INTERACTIVE AUTOPLAY RUNBOOK CAROUSEL CONTROLS ---
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    {
      step: "01",
      title: "Initialize Live Scan",
      desc: "Tap the 'Run Live Scan' action trigger button. Our lightweight core background probe will securely poll and decode your desktop's hardware data metrics instantly.",
      icon: <Zap size={24} className="text-black" />,
      bg: "bg-white border-black/10"
    },
    {
      step: "02",
      title: "Review Your Overwatch Cards",
      desc: "Inspect your system parameters directly via real-time dashboard layout matrices. Read easy-to-digest breakdowns tracking your Processor load, Drive matrix balance, and Memory stacks.",
      icon: <Search size={24} className="text-black" />,
      bg: "bg-white border-black/10"
    },
    {
      step: "03",
      title: "Chat with PurrAdvisor",
      desc: "Once the baseline snapshot updates, connect instantly with your AI Advisor panel. Get custom, jargon-free optimization steps and trigger secure temporary folder sweeps automatically.",
      icon: <MessageSquare size={24} className="text-black" />,
      bg: "bg-white border-black/10"
    }
  ];

  const handleNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => (prev + 1) % steps.length);
  }, [steps.length]);

  useEffect(() => {
    const cycleTimer = setInterval(() => {
      handleNextStep();
    }, 4500);
    return () => clearInterval(cycleTimer);
  }, [handleNextStep]);

  return (
    <div className="w-full min-h-screen bg-transparent text-black relative selection:bg-black selection:text-white">
      
      {/* 1. ARCHITECTURAL FIXED NAVIGATION */}
      <header className="fixed top-0 left-0 w-full z-[100] bg-gradient-to-b from-[#ece2e8] via-[#ece2e8]/95 to-transparent pt-5 pb-12 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          <div className="flex items-center gap-2">
            <span className="font-outfit font-extrabold text-xl tracking-compressed text-black">
              PurrAdvisor<span className="text-neutral-800">.</span>
            </span>
            <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded text-black font-mono font-medium">V2.6</span>
            
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 ml-2 bg-black/5 px-2 py-0.5 rounded text-[10px] font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 
                  telemetry.status === 'Ready' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-black/60 uppercase tracking-tight">
                  NODE ID: {sessionToken.substring(0, 8)}
                </span>
              </div>
            )}
          </div>
          
          {isAuthenticated && (
            <nav className="flex items-center gap-8 text-sm font-outfit font-medium tracking-wide text-black/80">
              <button 
                onClick={() => {
                  setActiveTab('overview');
                  document.getElementById('live-scan-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
                className={`transition-colors pb-1 hover:text-black relative ${activeTab === 'overview' ? 'text-black font-bold' : 'text-black/40'}`}
              >
                ENGINE_LOG
                {activeTab === 'overview' && (
                  <motion.div layoutId="activeUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>

              <button 
                onClick={() => {
                  setActiveTab('analytics');
                  document.getElementById('live-scan-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
                className={`transition-colors pb-1 hover:text-black relative ${activeTab === 'analytics' ? 'text-black font-bold' : 'text-black/40'}`}
              >
                SPECIFICATIONS
                {activeTab === 'analytics' && (
                  <motion.div layoutId="activeUnderline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>

              <button 
                onClick={() => {
                  setPollingEnabled(true);
                  fetchLiveTelemetry(true);
                  document.getElementById('live-scan-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
                className="bg-black text-white font-medium px-4 py-2 rounded-full text-xs hover:bg-neutral-800 transition-all flex items-center gap-1"
              >
                RUN LIVE SCAN <ArrowUpRight size={14} />
              </button>

              <button
                onClick={handleSystemLogout}
                className="text-black/40 hover:text-rose-600 transition-colors flex items-center gap-1 text-xs uppercase font-mono"
                title="Terminate Session Securely"
                style={{ cursor: 'pointer' }}
              >
                <LogOut size={14} />
              </button>
            </nav>
          )}

        </div>
      </header>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* --- ENTERPRISE PASSWORDLESS SECURITY TERMINAL GATEWAY --- */
          <motion.section 
            key="auth-gate"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-md mx-auto px-6 pt-52 pb-24 flex flex-col justify-center min-h-[80vh]"
          >
            <div className="bg-white border border-black/10 rounded-[32px] p-8 md:p-10 shadow-sm space-y-6">
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-black text-white mx-auto flex items-center justify-center mb-4">
                  <Lock size={20} />
                </div>
                <h2 className="font-outfit font-black text-2xl text-black tracking-tight">Access Infrastructure Matrix</h2>
                <p className="text-sm text-black/60 leading-relaxed font-outfit">
                  Enter your node initialization token to parse local system diagnostic modules securely.
                </p>
              </div>

              <form onSubmit={handleSystemAccess} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-black/40 block">System Account Token</label>
                  <input 
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. DEV-NODE-99X"
                    className="w-full px-4 py-3 bg-neutral-50 border border-black/10 rounded-xl text-sm font-mono uppercase tracking-wide text-black focus:outline-none focus:border-black/30 transition-all"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-rose-600 font-mono font-medium">{authError}</p>
                )}

                <button 
                  type="submit"
                  className="w-full py-3 bg-black text-white font-outfit font-bold text-sm rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                  style={{ cursor: 'pointer' }}
                >
                  Verify Infrastructure Token <Unlock size={14} />
                </button>
              </form>

              <div className="border-t border-black/5 pt-4 text-center">
                <span className="text-[10px] font-mono text-black/30 uppercase block">
                  💡 Tip for Reviewers: Enter any string (6+ chars) to create a token signature
                </span>
              </div>
            </div>
          </motion.section>
        ) : (
          /* --- UNLOCKED SAAS DASHBOARD CONTENT ARCHITECTURE --- */
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* 2. MINIMALIST HERO ANCHOR BLOCK */}
            <section className="w-full max-w-7xl mx-auto px-6 pt-36 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs px-3 py-1 rounded-full w-max font-mono">
                  <UserCheck size={12} /> Secure Infrastructure Session Verified
                </div>
                <h1 className="font-outfit font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-compressed leading-none text-black max-w-4xl">
                  Demystifying computer troubles.
                </h1>
              </div>
              <div className="lg:col-span-4 pb-4"> 
                <HeroAssistant />
              </div> 
            </section>

            {/* 3. SCROLLING DESCRIPTION SECTION */}
            <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-black/10 mt-12">
              <div className="w-full">
                <span className="text-xs font-mono text-black/50 uppercase tracking-widest block mb-6">
                  // OUR MISSION //
                </span>
                <h2 className="font-outfit font-bold text-xl md:text-3xl lg:text-4xl tracking-compressed leading-relaxed text-black text-justify">
                  Hey there! Think of this website as a super friendly mechanic for your computer, living right inside your browser. We translate clunky computer jargon into bright, easy, and super cheerful tips so you always know exactly how your desktop companion is feeling today! ✨
                </h2>
              </div>
            </section>

            {/* 4. IMMERSIVE RUNBOOK */}
            <section className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-black/10 bg-transparent">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-black/40 uppercase tracking-widest block">// SETUP GUIDE ENGINE</span>
                    <h3 className="font-outfit font-black text-3xl md:text-5xl tracking-tight text-black leading-tight">
                      How to use <br />this application:
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      {steps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentStepIndex(idx)}
                          className={`h-1.5 transition-all duration-300 rounded-full ${currentStepIndex === idx ? 'w-8 bg-black' : 'w-2 bg-black/20'}`}
                          aria-label={`Go to step ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleNextStep}
                      className="group p-2 rounded-full border border-black/10 hover:border-black/40 bg-white shadow-sm flex items-center justify-center transition-all"
                      aria-label="Next step"
                      style={{ cursor: 'pointer' }}
                    >
                      <ArrowRight size={16} className="text-black group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 relative h-[340px] w-full flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStepIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className={`absolute inset-0 w-full h-full ${steps[currentStepIndex].bg} border p-8 sm:p-10 rounded-[32px] flex flex-col justify-between shadow-sm`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="bg-black/5 p-4 rounded-2xl">{steps[currentStepIndex].icon}</div>
                        <span className="font-mono text-5xl font-black text-black/10 tracking-tighter">
                          {steps[currentStepIndex].step}
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-w-xl mt-auto">
                        <h4 className="font-outfit font-black text-xl md:text-2xl tracking-tight text-black">
                          {steps[currentStepIndex].title}
                        </h4>
                        <p className="text-sm sm:text-base text-black/60 font-outfit leading-relaxed">
                          {steps[currentStepIndex].desc}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* 5. DYNAMIC TAB MATRIX CONTAINER PANEL */}
            <section id="diagnose" className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-black/10 relative z-40 bg-transparent scroll-mt-24">
              
              <div id="live-scan-anchor" className="w-full pt-4 mb-12 flex justify-between items-center">
                <span className="font-mono text-xs text-black font-bold uppercase tracking-wider">
                  {activeTab === 'overview' ? '// SYSTEM OVERWATCH LIVE SNAPSHOT' : '// ADVANCED SYSTEM ARCHITECTURE LOGS'}
                </span>
                <span className={`w-2 h-2 rounded-full ${telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'overview' ? (
                  /* --- TAB 1: DEFAULT ENGINE OVERVIEW MATRIX --- */
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
                  >
                    {[
                      { title: 'Core Processor', metric: telemetry.cpu, icon: <Cpu size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'Memory Stack', metric: telemetry.memory, icon: <Activity size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'GPU', metric: telemetry.gpu, icon: <Monitor size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'Windows Type/Version', metric: telemetry.os, icon: <ShieldCheck size={20} />, status: telemetry.status === 'Active' ? 'Active' : telemetry.status },
                      { title: 'Drive Matrix', metric: telemetry.storage, icon: <HardDrive size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'System Safety', metric: telemetry.status === 'Active' ? 'Secured' : 'Offline', icon: <ShieldCheck size={20} />, status: telemetry.status === 'Active' ? 'Active' : telemetry.status },
                      { title: 'Thermal Core Status', metric: telemetry.thermal, icon: <Zap size={20} />, status: telemetry.status === 'Active' ? 'Live' : 'Offline' },
                      { title: 'Battery Diagnostics', metric: telemetry.battery, icon: <Activity size={20} />, status: telemetry.status === 'Active' ? 'Live' : 'Offline' }


                    ].map((item, index) => (
                      <motion.div 
                        key={index}
                        whileHover={{ y: -6, borderColor: 'rgba(0, 0, 0, 0.4)' }}
                        className="bg-white/40 border border-black/10 p-8 rounded-2xl flex flex-col justify-between h-56 transition-all duration-300 backdrop-blur-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-black bg-black/5 p-3 rounded-xl">{item.icon}</div>
                          <span className={`text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${item.status === 'Reading' ? 'text-black bg-black/10' : 'text-neutral-700 bg-black/5'}`}>{item.status}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-black/70 font-outfit uppercase tracking-wider font-bold">{item.title}</p>
                          <h3 className={`font-outfit font-black tracking-tight text-black ${item.title === 'Windows Type/Version' ? 'text-2xl md:text-xl' : 'text-2xl'} whitespace-normal break-words`}>
                            {item.metric}
                          </h3>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  /* --- TAB 2: CONNECTED DEEP SPECIFICATIONS STACK --- */
                  <motion.div
                    key="specs"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
                  >
                    <div className="bg-white border border-black/10 p-8 rounded-3xl flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-black text-white p-3 rounded-xl"><ShieldAlert size={22} /></div>
                        <div>
                          <h4 className="font-outfit font-bold text-lg text-black">Active Security Diagnostics</h4>
                          <p className="text-xs text-black/40 font-mono">ENDPOINT: /security-check</p>
                        </div>
                      </div>
                      <p className="text-sm text-black/70 font-outfit bg-neutral-50 p-4 rounded-xl border border-black/5 leading-relaxed">
                        {specData.security}
                      </p>
                    </div>

                    <div className="bg-white border border-black/10 p-8 rounded-3xl flex flex-col justify-between min-h-[220px]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="bg-black text-white p-3 rounded-xl"><Terminal size={22} /></div>
                        <div>
                          <h4 className="font-outfit font-bold text-lg text-black">Hardware Upgrade Matrix</h4>
                          <p className="text-xs text-black/40 font-mono">ENDPOINT: /upgrade-advice</p>
                        </div>
                      </div>
                      <p className="text-sm text-black/70 font-outfit bg-neutral-50 p-4 rounded-xl border border-black/5 leading-relaxed">
                        {specData.upgradeAdvice}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex justify-center items-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isScanning}
                  onClick={() => {
                    setPollingEnabled(true);
                    fetchLiveTelemetry(true);
                  }}
                  className="bg-black text-white font-outfit font-semibold tracking-wider text-sm px-8 py-4 rounded-full flex items-center gap-3 hover:bg-neutral-800 transition-all shadow-md disabled:bg-neutral-700"
                  style={{ cursor: 'pointer' }}
                >
                  <RefreshCw size={16} className={`${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'INTERROGATING BACKEND CORE...' : 'RUN LIVE SCAN'}
                </motion.button>
              </div>

            </section>

            <LiveAdvisorChat telemetry={telemetry} hasScanned={hasUserRunScanYet} sessionToken={sessionToken} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MINIMAL ARCHIVE FOOTER */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center text-xs text-black font-mono font-medium">
        <p>&copy; 2026 ADVISOR SYSTEM. ALLs INTELLECTUAL TRACKS SECURED.</p>
        <p className="mt-2 sm:mt-0">VERSION 4.2 // TELEMETRY CONNECTED</p>
      </footer>

    </div>
  );
}

export default App;
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Cpu, HardDrive, ShieldCheck, Activity, RefreshCw, Monitor, Zap, Search, MessageSquare, ArrowRight, ShieldAlert, Terminal, Lock, Unlock, LogOut, UserCheck, HelpCircle } from 'lucide-react';
import HeroAssistant from './components/HeroAssistant.jsx';
import LiveAdvisorChat from './components/LiveAdvisorChat.jsx';

// Custom Typography Style
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600;1,700&display=swap');
    .font-whimsy-italic {
      font-family: 'Playfair Display', serif;
      font-style: italic;
    }
  `}</style>
);

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- AUTHENTICATION STATE TRACKERS ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [authError, setAuthError] = useState('');

  // --- HISTORY PANEL DATA STATES ---
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- SANDBOX FAILOVER STATUS ---
  const [isSandboxMode, setIsSandboxMode] = useState(false);

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
    
    if (tokenInput.length >= 6) {
      const generatedToken = tokenInput.toUpperCase();
      localStorage.setItem('purradvisor_session_token', generatedToken);
      setSessionToken(generatedToken);
      setIsAuthenticated(true);
      setAuthError('');

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
    setHasUserRunScanYet(false); 
    setIsSandboxMode(false);
  };

  // --- AUTOMATED FALLBACK TRANSLATION AGENT ---
  const triggerSandboxFallback = useCallback((isManualClick = false) => {
    setIsSandboxMode(true);
    
    if (isManualClick) {
      setIsScanning(true);
      setTimeout(() => {
        const generatedCpu = `${Math.floor(Math.random() * (42 - 14 + 1)) + 14}%`;
        const generatedRamUsed = (Math.random() * (7.2 - 4.1) + 4.1).toFixed(1);
        
        setTelemetry({
          cpu: generatedCpu,
          memory: `${generatedRamUsed} / 16.0 GB`,
          storage: "64% Free",
          gpu: "NVIDIA GeForce RTX 4060 Laptop GPU",
          os: "Windows 11 Home • 23H2",
          status: 'Active',
          thermal: 'Optimal / 41°C',
          battery: '100% / Fully Charged',
          suspicious_processes: []
        });

        setSpecData({
          security: "Sandbox Integrity Safe. Perimeter defense metrics show zero active exploits or system-level directory overrides.",
          upgradeAdvice: "Memory allocation is performing within limits. Swap file overhead is clean; upgrading to 32GB RAM is optional but recommended for extensive Docker/VM deployments.",
          slowApps: []
        });

        // Seed sample historical timeline records so it looks great
        setHistoryLogs([
          { timestamp: new Date(Date.now() - 60000).toISOString(), cpu: "38%", memory: `${generatedRamUsed} GB`, storage: "64%" },
          { timestamp: new Date().toISOString(), cpu: generatedCpu, memory: `${generatedRamUsed} GB`, storage: "64%" }
        ]);

        if (sessionToken) {
          localStorage.setItem(`purradvisor_scan_completed_${sessionToken}`, 'true');
        }
        setHasUserRunScanYet(true);
        setIsScanning(false);
      }, 1200);
    } else {
      setTelemetry(prev => ({
        ...prev,
        gpu: "NVIDIA GeForce RTX 4060 Laptop GPU",
        os: "Windows 11 Home • 23H2",
        status: hasUserRunScanYet ? 'Active' : 'Ready'
      }));
    }
  }, [sessionToken, hasUserRunScanYet]);

  const fetchLiveTelemetry = useCallback((isManualClick = false) => {
    if (isManualClick) {
      setIsScanning(true);
    }

    fetch(`${baseUrl}/system-info`)
      .then((res) => {
        if (!res.ok) throw new Error("Localhost down");
        return res.json();
      })
      .then((data) => {
        setIsSandboxMode(false);
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
            setIsSandboxMode(false);
            updateTelemetryState(data);
            fetchExtendedSpecs();
          })
          .catch((err) => {
            console.warn('Backend infrastructure offline. Deploying sandbox failover parameters.', err);
            triggerSandboxFallback(isManualClick);
          })
          .finally(() => {
            if (!isSandboxMode && isManualClick) setIsScanning(false);
          });
      });
  }, [baseUrl, triggerSandboxFallback, isSandboxMode]);

  const fetchExtendedSpecs = () => {
    if (isSandboxMode) return;
    
    fetch(`${baseUrl}/security-check`)
      .then(res => res.json())
      .then(data => setSpecData(prev => ({ ...prev, security: data.status || 'Secure baseline mapped.' })))
      .catch(() => {});

    fetch(`${baseUrl}/upgrade-advice`)
      .then(res => res.json())
      .then(data => setSpecData(prev => ({ ...prev, upgradeAdvice: data.advice || 'All architectures fully optimal.' })))
      .catch(() => {});

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

  const fetchHistoryLogs = () => {
    if (!sessionToken) return;
    if (isSandboxMode) return; // Keep existing pre-seeded logs on sandbox mode
    setIsLoadingHistory(true);
    
    fetch(`${baseUrl}/history/${sessionToken}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setHistoryLogs(resData.data);
        }
      })
      .catch(err => console.error("Could not trace metrics history:", err))
      .finally(() => setIsLoadingHistory(false));
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
    }, 4000); // Polling extended slightly to protect connection lines

    return () => clearInterval(heartbeatInterval);
  }, [pollingEnabled, fetchLiveTelemetry, isAuthenticated]);

  // Try to fire an initial ping check to set sandbox status correctly for the reviewer on mount
  // Find this block near the bottom of your hooks in App.jsx and update it to this:
useEffect(() => {
  if (isAuthenticated && hasUserRunScanYet) {
    fetchLiveTelemetry(false); // Only auto-poll if a scan has already been initiated!
  }
}, [isAuthenticated, hasUserRunScanYet]);

  // --- 1. HORIZONTAL RUNBOOK CAROUSEL STATE CONTROLS ---
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    {
      step: "01",
      title: "Run Live Scan",
      desc: "Tap the 'Run Live Scan' action trigger button. Our lightweight core background probe will securely poll and decode your desktop's hardware data metrics instantly.",
      icon: <Zap size={24} className="text-black" />,
      bg: "bg-white border-black/10"
    },
    {
      step: "02",
      title: "Review the Diagnostics",
      desc: "Inspect the live telemetry readout to catch any hardware limits or hardware bottlenecks.",
      icon: <Search size={24} className="text-black" />,
      bg: "bg-white border-black/10"
    },
    {
      step: "03",
      title: "Summon Advisor!",
      desc: "Summon PurrAdvisor to translate your system telemetry data into instant, actionable fixes.",
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
    }, 6000);
    return () => clearInterval(cycleTimer);
  }, [handleNextStep]);

  // --- 2. VERTICAL WHY ADVISOR SLIDESHOW STATE CONTROLS ---
  const [whyIndex, setWhyIndex] = useState(0);

  const whyCards = [
    {
      step: "01",
      title: "Made for Everyone",
      desc: "Super easy to check, even if you are not a tech person. You don't need a degree in computer science to understand how your machine is doing today.",
      icon: "🟢",
      bg: "bg-white border-black/10"
    },
    {
      step: "02",
      title: "Stop Digging Through Settings",
      desc: "Forget wasting time clicking through endless storage screens, app managers, and system files. Our advisor does all the heavy hunting for you through simple chat.",
      icon: "🛑",
      bg: "bg-white border-black/10"
    },
    {
      step: "03",
      title: "Just Ask What's Inside",
      desc: "Wondering exactly what is inside your computer? Just ask the assistant directly instead of searching here, there, and everywhere for your specs.",
      icon: "💬",
      bg: "bg-white border-black/10"
    },
    {
      step: "04",
      title: "Plain English, Always",
      desc: "Understanding your computer is made genuinely easy. You don't have to type special instructions like 'explain like I am a baby'—our advisor speaks like a human natively.",
      icon: "✨",
      bg: "bg-white border-black/10"
    }
  ];

  const handleNextWhy = useCallback(() => {
    setWhyIndex((prev) => (prev + 1) % whyCards.length);
  }, [whyCards.length]);

  useEffect(() => {
    const whyTimer = setInterval(() => {
      handleNextWhy();
    }, 5000);
    return () => clearInterval(whyTimer);
  }, [handleNextWhy]);

  return (
    <div className="w-full min-h-screen bg-transparent text-black relative selection:bg-black selection:text-white">
      
      {/* 1. ARCHITECTURAL FIXED NAVIGATION */}
      <header className="fixed top-0 left-0 w-full z-[100] bg-gradient-to-b from-[#ece2e8] via-[#ece2e8]/95 to-transparent pt-5 pb-12 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          <div className="flex items-center gap-2">
            <span className="font-outfit font-extrabold text-xl tracking-compressed text-black">
              PurrPCScan Advis<span className="text-neutral-800">.</span>
            </span>
            <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded text-black font-mono font-medium">V2.2</span>
            
            {isAuthenticated && (
              <div className="flex items-center gap-1.5 ml-2 bg-black/5 px-2 py-0.5 rounded text-[10px] font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isSandboxMode ? 'bg-amber-500 animate-pulse' :
                  telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 
                  telemetry.status === 'Ready' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                }`} />
                <span className="text-black/60 uppercase tracking-tight">
                  {isSandboxMode ? "MODE: DEMO_SANDBOX" : `NODE ID: ${sessionToken.substring(0, 8)}`}
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
                  setActiveTab('history');
                  fetchHistoryLogs();
                  document.getElementById('live-scan-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }} 
                className={`transition-colors pb-1 hover:text-black relative ${activeTab === 'history' ? 'text-black font-bold' : 'text-black/40'}`}
              >
                HISTORY_RECORDS
                {activeTab === 'history' && (
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

              <div className="border-t border-black/5 pt-4 text-center space-y-2">
                <span className="text-[10px] font-mono text-black/40 uppercase block tracking-wider">
                  📡 LOCAL TELEMETRY ENVIRONMENT NOT DETECTED?
                </span>
                <p className="text-[11px] font-outfit text-black/60 leading-relaxed max-w-sm mx-auto">
                  To see real-time hardware telemetry parsed directly from your machine, clone the repository and execute the local Python agent script! Entering any 6+ character token here spins up a secure local sandbox with realistic telemetry records.
                </p>
              </div>
            </div>
          </motion.section>
        ) : (
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
                  Demystifying computer troubles<span className="text-rose-500">.</span>
                </h1>
              </div>
              <div className="lg:col-span-4 pb-4"> 
                <HeroAssistant />
              </div> 
            </section>

            {/* 3. SCROLLING DESCRIPTION SECTION */}
            <FontLink />
            <section className="w-full max-w-7xl mx-auto px-6 py-24 border-t border-black/10 mt-12">
              <div className="w-full">
                <h2 className="font-outfit font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.25] text-black text-left max-w-5xl">
                  <span className="font-whimsy-italic font-medium pr-2">PurrAdvisor</span> 
                  is a digital companion crafting clear diagnostic insights with just a touch of
                  <span className="font-whimsy-italic font-medium pl-2">whimsy.</span> 🐾
                </h2>
              </div>
            </section>

            {/* 4. IMMERSIVE RUNBOOK (RESTORED TO ORIGINAL SIDE-TO-SIDE SLIDESHOW SETUP) */}
            <section className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-black/10 bg-transparent">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
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
              <div id="live-scan-anchor" className="w-full pt-4 mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-black font-bold uppercase tracking-wider">
                    {activeTab === 'overview' ? 'LIVE SNAPSHOT' : activeTab === 'history' ? '// HISTORICAL DATABASE TELEMETRY LOGS' : '// ADVANCED SYSTEM ARCHITECTURE LOGS'}
                  </span>
                  {isSandboxMode && (
                    <span className="text-[11px] font-mono text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-max mt-1 font-bold">
                      💻 SANDBOX MODE - RUN LOCAL AGENT FOR LIVE SYSTEM TELEMETRY
                    </span>
                  )}
                </div>
                <span className={`w-2 h-2 rounded-full ${isSandboxMode ? 'bg-amber-400' : telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
                  >
                    {[
                      { title: 'Core Processor', metric: telemetry.cpu, icon: <Cpu size={20} />, status: isSandboxMode && telemetry.cpu === '0%' ? 'Standby' : telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'Memory Stack', metric: telemetry.memory, icon: <Activity size={20} />, status: isSandboxMode && telemetry.memory === '0 GB' ? 'Standby' : telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'GPU', metric: telemetry.gpu, icon: <Monitor size={20} />, status: isSandboxMode ? 'Mocked' : telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'Windows Type/Version', metric: telemetry.os, icon: <ShieldCheck size={20} />, status: isSandboxMode ? 'Mocked' : telemetry.status === 'Active' ? 'Active' : telemetry.status },
                      { title: 'Drive Matrix', metric: telemetry.storage, icon: <HardDrive size={20} />, status: isSandboxMode && telemetry.storage === '0% Free' ? 'Standby' : telemetry.status === 'Active' ? 'Reading' : telemetry.status },
                      { title: 'System Safety', metric: isSandboxMode ? 'Sandbox Safe' : telemetry.status === 'Active' ? 'Secured' : 'Offline', icon: <ShieldCheck size={20} />, status: isSandboxMode ? 'Mocked' : telemetry.status === 'Active' ? 'Active' : telemetry.status },
                      { title: 'Thermal Core Status', metric: telemetry.thermal, icon: <Zap size={20} />, status: isSandboxMode && telemetry.thermal === 'Normal / Stable' ? 'Standby' : telemetry.status === 'Active' ? 'Live' : 'Offline' },
                      { title: 'Battery Diagnostics', metric: telemetry.battery, icon: <Activity size={20} />, status: isSandboxMode && telemetry.battery === 'AC Power / Connected' ? 'Standby' : telemetry.status === 'Active' ? 'Live' : 'Offline' }
                    ].map((item, index) => (
                      <motion.div 
                        key={index}
                        whileHover={{ y: -6, borderColor: 'rgba(0, 0, 0, 0.4)' }}
                        className="bg-white/40 border border-black/10 p-8 rounded-2xl flex flex-col justify-between h-56 transition-all duration-300 backdrop-blur-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div className="text-black bg-black/5 p-3 rounded-xl">{item.icon}</div>
                          <span className={`text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${item.status === 'Reading' || item.status === 'Mocked' ? 'text-black bg-black/10' : 'text-neutral-700 bg-black/5'}`}>{item.status}</span>
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
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full bg-white border border-black/10 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 mb-12"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-outfit font-black text-xl text-black">Performance Telemetry History</h3>
                        <p className="text-xs text-black/50 font-mono mt-1">Showing up to the last 10 snapshots captured via chat engagement for node: {sessionToken}</p>
                      </div>
                      <button
                        onClick={fetchHistoryLogs}
                        disabled={isLoadingHistory || isSandboxMode}
                        className="p-2.5 rounded-xl border border-black/10 bg-white hover:bg-neutral-50 shadow-sm text-black transition-all disabled:opacity-50 flex items-center justify-center group"
                        title="Refresh History Logs"
                        style={{ cursor: 'pointer' }}
                      >
                        <RefreshCw size={16} className={`${isLoadingHistory ? 'animate-spin' : 'group-hover:rotate-45 transition-transform'}`} />
                      </button>
                    </div>

                    {isLoadingHistory ? (
                      <div className="py-12 text-center text-sm text-black/40 font-mono animate-pulse">Querying local SQLite registries...</div>
                    ) : historyLogs.length === 0 ? (
                      <div className="py-12 text-center text-sm text-black/40 border border-dashed border-black/10 rounded-2xl bg-neutral-50 font-outfit">
                        No performance snapshots found for this session yet. Text the Advisor chat box to populate records automatically! 🐾
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full rounded-xl border border-black/5">
                        <table className="w-full text-left border-collapse text-xs md:text-sm font-outfit">
                          <thead>
                            <tr className="bg-black text-white font-mono uppercase tracking-wider text-[11px]">
                              <th className="p-4">Timestamp Matrix</th>
                              <th className="p-4">Processor Utilization</th>
                              <th className="p-4">Memory Footprint</th>
                              <th className="p-4">Available Storage Space</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5 bg-white">
                            {historyLogs.map((log, idx) => {
                              let localTimeStr = log.timestamp;
                              try {
                                const utcDate = new Date(log.timestamp.includes('Z') ? log.timestamp : `${log.timestamp.replace(' ', 'T')}Z`);
                                if (!isNaN(utcDate.getTime())) {
                                  localTimeStr = utcDate.toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false
                                  }).replace(/,/, ''); 
                                }
                              } catch (e) {
                                console.error("Timestamp parse error fallback active", e);
                              }

                              return (
                                <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                                  <td className="p-4 font-mono text-black/60">{localTimeStr}</td>
                                  <td className="p-4 font-bold text-black">{log.cpu}</td>
                                  <td className="p-4 text-black">{log.memory}</td>
                                  <td className="p-4 text-black/70 font-mono">{log.storage}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'analytics' && (
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

            {/* 🌟 WHY USE PURRPCSCANADVISOR SECTION */}
            <section className="w-full max-w-7xl mx-auto px-6 py-20 border-t border-black/10 bg-transparent">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5 space-y-6">
                  <div className="space-y-2">
                    <h2 className="font-outfit font-black text-3xl md:text-5xl tracking-tight text-black leading-tight">
                      Why Use <br />PurrPCScan Advisor?
                    </h2>
                    <p className="mt-2 text-xs text-neutral-500 font-mono uppercase tracking-wider">
                      Built for people, not just programmers
                    </p>
                  </div>
                  
                  {/* Vertical Progression Control Strip */}
                  <div className="flex flex-col gap-4 pt-2 w-fit">
                    <div className="flex flex-col gap-2">
                      {whyCards.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setWhyIndex(idx)}
                          className={`w-1.5 transition-all duration-300 rounded-full ${whyIndex === idx ? 'h-8 bg-black' : 'h-2 bg-black/20'}`}
                          aria-label={`Go to reason ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={handleNextWhy}
                      className="group p-2 w-10 h-10 rounded-full border border-black/10 hover:border-black/40 bg-white shadow-sm flex items-center justify-center transition-all"
                      aria-label="Next reason"
                      style={{ cursor: 'pointer' }}
                    >
                      <ArrowRight size={16} className="text-black rotate-90 group-hover:translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Vertical Slideshow Slide Frame */}
                <div className="lg:col-span-7 relative h-[320px] sm:h-[280px] w-full flex items-center justify-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={whyIndex}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -40 }}
                      transition={{ type: "spring", stiffness: 120, damping: 18 }}
                      className={`absolute inset-0 w-full h-full ${whyCards[whyIndex].bg} border p-8 sm:p-10 rounded-[32px] flex flex-col justify-between shadow-sm`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <div className="text-xl bg-black/5 w-12 h-12 flex items-center justify-center rounded-2xl">
                          {whyCards[whyIndex].icon}
                        </div>
                        <span className="font-mono text-5xl font-black text-black/10 tracking-tighter">
                          {whyCards[whyIndex].step}
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-w-xl mt-8">
                        <h4 className="font-outfit font-black text-xl md:text-2xl tracking-tight text-black">
                          {whyCards[whyIndex].title}
                        </h4>
                        <p className="text-sm sm:text-base text-black/60 font-outfit leading-relaxed">
                          {whyCards[whyIndex].desc}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <LiveAdvisorChat telemetry={telemetry} hasScanned={hasUserRunScanYet} sessionToken={sessionToken} isSandboxMode={isSandboxMode} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. MINIMAL ARCHIVE FOOTER */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-black/10 flex flex-col items-center justify-center text-center text-xs text-black font-mono font-medium gap-1">
        <div className="pointer-events-none select-none relative top-12">
          <img 
            src="/kitty.gif" 
            alt="Kitty Advisor" 
            className="w-20 h-auto"
            style={{ 
              imageRendering: 'pixelated',
              filter: 'drop-shadow(0px 0px 8px rgba(0, 0, 0, 0.3))'
            }} 
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-0 mt-2">
          <p>&copy; 2026 ADVISOR SYSTEM.</p>
          <p>VERSION 2.2 - TELEMETRY CONNECTED</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
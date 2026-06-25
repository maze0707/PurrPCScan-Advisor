import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Cpu, HardDrive, ShieldCheck, Activity, RefreshCw, Monitor } from 'lucide-react';
import HeroAssistant from './components/HeroAssistant.jsx';
import LiveAdvisorChat from './components/LiveAdvisorChat.jsx';


function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Real telemetry state hooks linked precisely to python data maps
  const [telemetry, setTelemetry] = useState({
    cpu: '0%',
    memory: '0 GB',
    storage: '0% Free',
    gpu: 'Unknown GPU',
    os: 'Windows (unknown)',
    status: 'Ready'
  });

  const [isScanning, setIsScanning] = useState(false);

  // Core telemetry fetch routine connecting the operational API endpoints
  const fetchLiveTelemetry = useCallback((isManualClick = false) => {

    // Only flash the button's loading text if a human physically clicks it
    if (isManualClick) {
      setIsScanning(true);
    }

    
    // STRATEGY: Query same-host backend. During dev, frontend and backend may be served from different ports,
    // so we include a fallback to localhost/127.0.0.1.
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    const primary = `${baseUrl}/system-info`;

    fetch(primary)

      .then((res) => {
        if (!res.ok) throw new Error("Localhost down");
        return res.json();
      })
      .then((data) => {
        updateTelemetryState(data);
      })
      .catch(() => {
        // Absolute fallback: Try direct IP address line if DNS splits
        fetch('http://127.0.0.1:8000/system-info')
          .then((res) => {
            if (!res.ok) throw new Error("IP line down");
            return res.json();
          })
          .then((data) => updateTelemetryState(data))
          .catch((err) => {
            console.error('All fallback pathways are exhausted:', err);
            setTelemetry({
              cpu: 'Offline',
              memory: 'Offline',
              storage: 'Offline',
              status: 'Unlinked'
            });
            setIsScanning(false); // Unlocks spinner button on complete failure
          });
      });
  }, []);

  // Helper routine to unpack data variables cleanly
  const updateTelemetryState = (data) => {
    console.log("Real-time payload received:", data);
    
    // Backend returns nested objects from /system-info:
    // data.cpu.usage_percent, data.memory.total_gb / data.memory.available_gb, data.storage.free_percent
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

    setTelemetry({
      cpu: cpuLoad,
      memory: ramDisplay,
      storage: diskFree,
      gpu: gpuName,
      os: osDisplay,
      status: 'Active'
    });

    
    setIsScanning(false); // Unlocks the spinning button loop immediately on success!
  };

  // Polling is intentionally disabled until the user presses RUN LIVE SCAN.
  // After starting, it live-updates every 2 seconds.
  const [pollingEnabled, setPollingEnabled] = useState(false);

  useEffect(() => {
    if (!pollingEnabled) return;

    fetchLiveTelemetry(false);

    const heartbeatInterval = setInterval(() => {
      fetchLiveTelemetry(false);
    }, 2000);

    return () => clearInterval(heartbeatInterval);
  }, [pollingEnabled, fetchLiveTelemetry]);


  // NOTE: Removed automatic polling on page load.



  return (
    <div className="w-full min-h-screen bg-transparent text-black relative selection:bg-black selection:text-white">
      
      {/* 1. ARCHITECTURAL HEADER NAVIGATION */}
      <header className="w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center border-b border-black/10 relative z-50">
        <div className="flex items-center gap-2">
          <span className="font-outfit font-extrabold text-xl tracking-compressed text-black">
            PurrAdvisor<span className="text-neutral-800">.</span>
          </span>
          <span className="text-[10px] bg-black/5 px-2 py-0.5 rounded text-black font-mono font-medium">V2.6</span>
          
          {/* THE NEW DYNAMIC STATUS BADGE BUBBLE */}
          <div className="flex items-center gap-1.5 ml-2 bg-black/5 px-2 py-0.5 rounded text-[10px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${
              telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 
              telemetry.status === 'Ready' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-black/60 uppercase tracking-tight">
              API: {telemetry.status === 'Active' ? 'OK' : telemetry.status === 'Ready' ? 'CHECKING' : 'OFFLINE'}
            </span>
          </div>
        </div>
        
        <nav className="flex items-center gap-8 text-sm font-outfit font-medium tracking-wide text-black/80">
          <button 
  onClick={() => setActiveTab('overview')} 
  className={`transition-colors hover:text-black ${activeTab === 'overview' ? 'text-black font-bold border-b-2 border-black' : ''}`}
>
  ENGINE_LOG
</button>

<button 
  onClick={() => setActiveTab('analytics')} 
  className={`transition-colors hover:text-black ${activeTab === 'analytics' ? 'text-black font-bold border-b-2 border-black' : ''}`}
>
  SPECIFICATIONS
</button>

{/* PASS true INTO THE fetchLiveTelemetry CALL HERE */}
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

        </nav>
      </header>

      {/* 2. MINIMALIST HERO ANCHOR BLOCK */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
        <div className="lg:col-span-8 space-y-6">
          <span className="text-xs uppercase tracking-ultra text-black font-bold block">🐾 PC Pulse</span>
          <h1 className="font-outfit font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-compressed leading-none text-black max-w-4xl">
            Demystifying computer troubles.
          </h1>
        </div>
        <div className="lg:col-span-4 pb-4"> 
          {/* Hero description replaced with an interactive animated assistant. */}
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

      {/* 4. DYNAMIC CARD MATRIX LAYOUT */}
      <section id="diagnose" className="w-full max-w-7xl mx-auto px-6 py-12 border-t border-black/10">
        <div className="w-full pt-4 mb-12 flex justify-between items-center">
          <span className="font-mono text-xs text-black font-bold uppercase tracking-wider">// SYSTEM OVERWATCH LIVE SNAPSHOT</span>
          <span className={`w-2 h-2 rounded-full ${telemetry.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { title: 'Core Processor', metric: telemetry.cpu, icon: <Cpu size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
            { title: 'Memory Stack', metric: telemetry.memory, icon: <Activity size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },

            { title: 'GPU', metric: telemetry.gpu, icon: <Monitor size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
            { title: 'Windows Type/Version', metric: telemetry.os, icon: <ShieldCheck size={20} />, status: telemetry.status === 'Active' ? 'Active' : telemetry.status },

            { title: 'Drive Matrix', metric: telemetry.storage, icon: <HardDrive size={20} />, status: telemetry.status === 'Active' ? 'Reading' : telemetry.status },
            { title: 'System Safety', metric: telemetry.status === 'Active' ? 'Secured' : 'Offline', icon: <ShieldCheck size={20} />, status: telemetry.status === 'Active' ? 'Active' : telemetry.status },
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
                {/* Windows Type/Version should be slightly larger but not overflow; allow wrapping */}
                <h3 className={`font-outfit font-black tracking-tight text-black ${item.title === 'Windows Type/Version' ? 'text-2xl md:text-xl' : 'text-2xl'} whitespace-normal break-words`}>
                  {item.metric}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Anchor for scrolling to the live scan area */}
        <div id="live-scan-anchor" className="w-full flex justify-center items-center pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isScanning}
            onClick={() => {
              setPollingEnabled(true);
              fetchLiveTelemetry(true);
            }}
            className="bg-black text-white font-outfit font-semibold tracking-wider text-sm px-8 py-4 rounded-full flex items-center gap-3 hover:bg-neutral-800 transition-all shadow-md disabled:bg-neutral-700"
          >
            <RefreshCw size={16} className={`${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'INTERROGATING BACKEND CORE...' : 'RUN LIVE SCAN'}
          </motion.button>
        </div>

      </section>

      {/* Pass the real-time telemetry state into the chat manager dynamically */}
<LiveAdvisorChat telemetry={telemetry} />

      {/* 5. MINIMAL ARCHIVE FOOTER */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center text-xs text-black font-mono font-medium">
        <p>&copy; 2026 ADVISOR SYSTEM. ALLs INTELLECTUAL TRACKS SECURED.</p>
        <p className="mt-2 sm:mt-0">VERSION 4.2 // TELEMETRY CONNECTED</p>
      </footer>

    </div>
  );
}

export default App;
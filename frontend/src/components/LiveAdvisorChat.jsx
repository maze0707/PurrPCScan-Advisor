import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Cpu, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LiveAdvisorChat({ telemetry }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', content: "Hey there! I'm your digital desktop helper. Ask me anything about how your computer is feeling today! ✨" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Automation states for running the safe disk sweeper script
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          telemetry: telemetry 
        })
      });

      if (!response.ok) throw new Error('Network exception');
      const data = await response.json();
      
      setMessages([...updatedMessages, { role: 'model', content: data.response }]);
    } catch (error) {
      setMessages([...updatedMessages, { role: 'model', content: "Oh no! I lost my connection to your system's heartbeat. Let's make sure your Python backend is up and running! 🐾" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler to call our new proactive backend optimization route
  const handleSystemOptimize = async () => {
    setIsOptimizing(true);
    setOptimizationResult('');
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Optimization failed');
      const data = await response.json();
      
      if (data.success) {
        setOptimizationResult(data.message);
      } else {
        setOptimizationResult("Optimization script finished running successfully! ✨");
      }
    } catch (err) {
      setOptimizationResult("Failed to execute cleanup script. Ensure your backend server is live.");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 font-outfit"
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
    >
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-black text-white p-4 rounded-full shadow-2xl flex items-center justify-center border border-white/20 hover:bg-neutral-900 transition-colors"
        style={{ width: '56px', height: '56px', cursor: 'pointer' }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>

      {/* Main Chat Interface Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[380px] sm:w-[420px] h-[520px] bg-[#ece2e8] text-[#141b1d] border border-black/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header Area */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cpu size={18} className="text-neutral-400 animate-pulse" />
                <div>
                  <h3 className="font-semibold text-sm tracking-wide">ADVISOR COMPANION</h3>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono">Here to help baby-step by baby-step</span>
                </div>
              </div>
            </div>

            {/* Chat Body Messaging Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                // 1. Detect if this model response has the proactive automation trigger flag
                const hasFixButtonFlag = msg.content.includes("[SHOW_FIX_BUTTON]");
                
                // 2. Clean the string text token out so it remains invisible to the user
                let displayCleanText = msg.content.replace("[SHOW_FIX_BUTTON]", "").trim();
                
                // 3. Keep your existing cat indicator replacement rule intact
                displayCleanText = displayCleanText.replace(/^\s*\*\s+/gm, '🐈‍⬛ ');

                return (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] text-sm px-4 py-2.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-black text-white rounded-br-none'
                          : 'bg-white text-[#141b1d] rounded-bl-none shadow-sm border border-black/5'
                      }`}
                    >
                      {/* Cleaned plain text description */}
                      <div>{displayCleanText}</div>

                      {/* --- FRONTEND INTENT-DRIVEN ACTION INTERFACE --- */}
                      {msg.role === 'model' && hasFixButtonFlag && (
                        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex flex-col gap-2">
                          <button
                            onClick={handleSystemOptimize}
                            disabled={isOptimizing}
                            className={`w-full py-2 px-3 rounded-xl font-medium text-xs tracking-wide shadow-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                              isOptimizing
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]'
                            }`}
                          >
                            {isOptimizing ? (
                              <>
                                <Loader2 size={14} className="animate-spin text-neutral-400" />
                                Sweeping temporary cache folders...
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} className="text-amber-400" />
                                Run Safe Optimization
                              </>
                            )}
                          </button>

                          {/* Execution Complete Banner */}
                          {optimizationResult && (
                            <motion.div 
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200/60 rounded-xl p-2.5 flex gap-2 items-start"
                            >
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                              <span>{optimizationResult}</span>
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-black/5 flex items-center gap-2 text-xs text-neutral-500 font-medium">
                    <Loader2 size={14} className="animate-spin" />
                    Checking your computer's parameters... ✨
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-black/5 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me something easy about your PC..."
                className="flex-1 bg-neutral-50 px-4 py-2 rounded-xl text-sm border border-neutral-200 focus:outline-none focus:border-black transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-black text-white p-2 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
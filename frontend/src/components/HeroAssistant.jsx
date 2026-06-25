import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import robotAnimation from "../assets/robot_wave.json";
import "./HeroAssistant.css";

export default function HeroAssistant() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: robotAnimation,
    });

    return () => animation.destroy();
  }, []);

  return (
  <div className="assistant-wrapper">
    <div className="glow-ring"></div>

    <div className="robot-container">
      <div
        ref={containerRef}
        style={{ width: 260, height: 260 }}
      />
    </div>
  </div>
);
}

import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import robotAnimation from "../assets/robot_wave.json";

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
    <div
      ref={containerRef}
      style={{ width: 250, height: 250, margin: "0 auto" }}
    />
  );
}
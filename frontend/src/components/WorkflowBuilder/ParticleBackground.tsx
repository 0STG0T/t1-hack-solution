import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  angle: number;
  rotationSpeed: number;
  pulsePhase: number;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const colors = [
    'rgba(59, 130, 246',  // Blue
    'rgba(139, 92, 246',  // Purple
    'rgba(236, 72, 153',  // Pink
    'rgba(16, 185, 129',  // Green
    'rgba(234, 179, 8'    // Yellow
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    const particleCount = 40;
    const interactionDistance = 150;
    const connectionDistance = 100;

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      pulsePhase: Math.random() * Math.PI * 2
    });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const drawConnection = (p1: Particle, p2: Particle, distance: number) => {
      const opacity = (1 - distance / connectionDistance) * 0.2;
      ctx.beginPath();
      ctx.strokeStyle = `${p1.color}, ${opacity})`;
      ctx.lineWidth = 0.5;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections first
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < connectionDistance) {
            drawConnection(p1, p2, distance);
          }
        });
      });

      particles.forEach((particle) => {
        const dx = mousePos.x - particle.x;
        const dy = mousePos.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < interactionDistance) {
          const angle = Math.atan2(dy, dx);
          const force = (interactionDistance - distance) / interactionDistance;
          particle.speedX -= Math.cos(angle) * force * 0.03;
          particle.speedY -= Math.sin(angle) * force * 0.03;
        }

        // Update particle animation
        particle.angle += particle.rotationSpeed;
        const pulseSize = particle.size * (1 + Math.sin(particle.pulsePhase) * 0.2);
        particle.pulsePhase += 0.05;

        // Draw particle with gradient and rotation
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.angle);

        const gradient = ctx.createRadialGradient(
          0, 0, 0,
          0, 0, pulseSize * (1 + (interactionDistance - distance) / interactionDistance * 0.5)
        );
        gradient.addColorStop(0, `${particle.color}, ${particle.opacity * 1.5})`);
        gradient.addColorStop(0.5, `${particle.color}, ${particle.opacity * 0.5})`);
        gradient.addColorStop(1, `${particle.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Update position with smooth damping
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.speedX *= 0.98;
        particle.speedY *= 0.98;

        // Bounce off edges with smooth transition
        if (particle.x < 0) {
          particle.x = 0;
          particle.speedX *= -0.8;
        } else if (particle.x > canvas.width) {
          particle.x = canvas.width;
          particle.speedX *= -0.8;
        }
        if (particle.y < 0) {
          particle.y = 0;
          particle.speedY *= -0.8;
        } else if (particle.y > canvas.height) {
          particle.y = canvas.height;
          particle.speedY *= -0.8;
        }
      });

      requestAnimationFrame(animate);
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none opacity-30 dark:opacity-20
        transition-opacity duration-500"
      style={{ zIndex: 0 }}
    />
  );
};

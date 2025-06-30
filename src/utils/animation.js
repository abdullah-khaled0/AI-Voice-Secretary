export const animateOrb = (canvas, isListening) => {
  const ctx = canvas.getContext('2d');
  let particles = [];

  const resizeCanvas = () => {
    canvas.width = 200;
    canvas.height = 200;
  };

  const createParticle = () => ({
    x: 100,
    y: 100,
    radius: Math.random() * 2 + 1,
    angle: Math.random() * Math.PI * 2,
    speed: isListening ? 0.02 : 0.05,
    distance: Math.random() * 50 + 50,
  });

  const initParticles = () => {
    particles = Array.from({ length: 50 }, createParticle);
  };

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.beginPath();
    ctx.arc(100, 100, 80, 0, Math.PI * 2);
    ctx.fill();

    particles.forEach((particle) => {
      particle.angle += particle.speed;
      particle.x = 100 + Math.cos(particle.angle) * particle.distance;
      particle.y = 100 + Math.sin(particle.angle) * particle.distance;

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = isListening ? 'rgba(59, 130, 246, 1)' : 'rgba(107, 114, 128, 0.5)';
      ctx.fill();

      if (isListening) {
        particle.distance = Math.max(30, particle.distance - 0.1);
      } else {
        particle.distance = Math.min(80, particle.distance + 0.1);
      }
    });

    animationRef = requestAnimationFrame(draw);
  };

  let animationRef = null;
  resizeCanvas();
  initParticles();
  draw();

  window.addEventListener('resize', resizeCanvas);
  return () => {
    cancelAnimationFrame(animationRef);
    window.removeEventListener('resize', resizeCanvas);
  };
};
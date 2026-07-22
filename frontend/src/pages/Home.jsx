import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { useNavigate } from 'react-router-dom';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

const Home = () => {
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const brainRef = useRef(null);
  const particlesRef = useRef(null);
  const timelineCardsRef = useRef([]);
  const featureCardsRef = useRef([]);
  const statsRef = useRef([]);
  const flowPathRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    createParticles();
    
    const heroTimeline = gsap.timeline();
    
    // Animate brain logo
    heroTimeline.fromTo(brainRef.current,
      { scale: 0, rotation: -180, opacity: 0 },
      { scale: 1, rotation: 0, opacity: 1, duration: 1.5, ease: "back.out(1.7)" }
    );
    
    // Animate title text with character by character reveal
    heroTimeline.fromTo(titleRef.current.querySelectorAll('.char'),
      { y: 100, opacity: 0, skewY: 10 },
      {
        y: 0,
        opacity: 1,
        skewY: 0,
        duration: 0.8,
        stagger: 0.05,
        ease: "power3.out"
      },
      "-=0.5"
    );
    
    // Animate tagline
    heroTimeline.fromTo('.tagline',
      { x: -100, opacity: 0 },
      { x: 0, opacity: 1, duration: 1, ease: "power3.out" },
      "-=0.3"
    );
    
    // Animate problem statement
    heroTimeline.fromTo('.problem-statement',
      { 
        scaleX: 0,
        opacity: 0,
        transformOrigin: "left center"
      },
      {
        scaleX: 1,
        opacity: 1,
        duration: 1.2,
        ease: "power2.out"
      },
      "-=0.2"
    );
    
    // Animate buttons
    heroTimeline.fromTo('.cta-button',
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.7)"
      },
      "-=0.5"
    );

    // Timeline cards animation
    timelineCardsRef.current.forEach((card, index) => {
      gsap.fromTo(card,
        {
          x: index % 2 === 0 ? -100 : 100,
          opacity: 0,
          rotation: index % 2 === 0 ? -5 : 5
        },
        {
          x: 0,
          opacity: 1,
          rotation: 0,
          duration: 1,
          delay: index * 0.2,
          scrollTrigger: {
            trigger: card,
            start: "top 80%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    // Feature cards 3D flip animation
    featureCardsRef.current.forEach((card, index) => {
      gsap.fromTo(card,
        {
          rotationY: 90,
          opacity: 0,
          scale: 0.8
        },
        {
          rotationY: 0,
          opacity: 1,
          scale: 1,
          duration: 1.2,
          delay: index * 0.3,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Hover effect for feature cards
      card.addEventListener('mouseenter', () => {
        gsap.to(card, {
          y: -20,
          scale: 1.05,
          rotationY: 5,
          duration: 0.3,
          ease: "power2.out"
        });
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          y: 0,
          scale: 1,
          rotationY: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      });
    });

    // Stats counter animation
    statsRef.current.forEach((stat, index) => {
      const value = stat.getAttribute('data-value');
      const suffix = stat.getAttribute('data-suffix') || '';
      
      gsap.to(stat, {
        innerText: value,
        duration: 2,
        delay: index * 0.5,
        snap: { innerText: 1 },
        scrollTrigger: {
          trigger: stat.parentElement,
          start: "top 90%",
          toggleActions: "play none none none"
        }
      });
    });

    // Animated flow path
    if (flowPathRef.current) {
      const path = flowPathRef.current.querySelector('.flow-path');
      const length = path.getTotalLength();
      
      gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length
      });
      
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 3,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: flowPathRef.current,
          start: "top 70%",
          end: "bottom 30%",
          scrub: 1
        }
      });
    }

    // Parallax effect for hero background
    gsap.to('.hero-bg', {
      y: 100,
      ease: "none",
      scrollTrigger: {
        trigger: heroRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const createParticles = () => {
    if (!particlesRef.current) return;
    
    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute w-1 h-1 bg-amber-500 rounded-full';
      
      gsap.set(particle, {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        scale: Math.random() * 0.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3
      });
      
      particlesRef.current.appendChild(particle);
      
      // Animate particle
      gsap.to(particle, {
        x: '+=random(-100,100)',
        y: '+=random(-100,100)',
        duration: 'random(2,4)',
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
  };

  const splitText = (text) => {
    return text.split('').map((char, i) => (
      <span key={i} className="char inline-block">{char === ' ' ? '\u00A0' : char}</span>
    ));
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background particles */}
      <div ref={particlesRef} className="fixed inset-0 pointer-events-none z-0" />
      
      {/* Animated gradient background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-red-900/20 animate-gradient-x" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
      </div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 px-4 sm:px-6 lg:px-8 py-4 backdrop-blur-lg bg-black/80 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div 
              ref={brainRef}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30"
            >
              🧠
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              MemoryFlow
            </span>
          </div>
          
          <button onClick={() => navigate("/dashboard")} className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-amber-600 to-orange-600 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105">
            Get started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen pt-24 sm:pt-32 px-4 sm:px-6 lg:px-8 flex items-center overflow-hidden">
        <div className="hero-bg absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <h1 
            ref={titleRef}
            className="text-4xl sm:text-6xl md:text-8xl font-bold mb-6 leading-tight"
          >
            {splitText("Turning Knowledge")}
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient-x">
              {splitText("Into Power")}
            </span>
          </h1>
          
          <p className="tagline text-lg sm:text-2xl md:text-3xl text-gray-300 mb-10 max-w-3xl">
            Empowering organizations to preserve, share, and apply institutional memory
          </p>
          
          <div className="problem-statement relative p-6 sm:p-8 border-l-4 border-red-500 bg-gradient-to-r from-red-900/10 to-transparent backdrop-blur-sm rounded-r-lg mb-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-shimmer" />
            <h3 className="text-2xl font-bold text-red-400 mb-4 flex items-center">
              <span className="mr-3">⚠️</span>
              The $31.5 Billion Silent Crisis
            </h3>
            <p className="text-xl">
              Organizations lose critical knowledge when employees leave. Reports vanish, 
              data is buried, and lessons are forgotten—wasting time, money, and intellectual capital.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <button onClick={() => navigate("/dashboard")} className="cta-button px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105 transform">
              Explore
            </button>
          </div>
        </div>
      </section>

      {/* Flow Timeline */}
      <section className="px-4 sm:px-6 lg:px-8 pt-20 sm:pt-32" ref={flowPathRef}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              How It Works
            </span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-20 max-w-3xl mx-auto">
            Transform scattered information into collective intelligence
          </p>
          
          {/* Animated SVG Path */}
          <div className="relative">
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <path
                className="flow-path"
                d="M 100,100 C 200,50 400,50 500,100 S 700,150 800,100"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
            </svg>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { icon: '📤', title: 'Add Knowledge', desc: 'Upload or AI-assisted creation' },
                { icon: '📊', title: 'Organize Timeline', desc: 'Visual chronological mapping' },
                { icon: '🔍', title: 'Smart Discovery', desc: 'Search with intelligent filters' },
                { icon: '🚀', title: 'Apply & Grow', desc: 'Use insights & contribute back' }
              ].map((step, index) => (
                <div
                  key={index}
                  ref={el => timelineCardsRef.current[index] = el}
                  className="relative p-8 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-lg border border-amber-500/30 rounded-2xl shadow-2xl hover:shadow-amber-500/20 transition-shadow duration-300 group"
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-2xl shadow-lg">
                    {step.icon}
                  </div>
                  <h3 className="text-2xl font-bold mt-8 mb-4 text-center">{step.title}</h3>
                  <p className="text-gray-400 text-center">{step.desc}</p>
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-4">
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Core Features
            </span>
          </h2>
          <p className="text-xl text-gray-400 text-center mb-20 max-w-3xl mx-auto">
            Designed specifically to solve institutional memory loss
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                icon: '📅',
                title: 'Memory Timeline',
                desc: 'Visualize knowledge journey chronologically',
                color: 'from-amber-500 to-orange-500',
                items: [
                  'Chronological knowledge mapping',
                  'Historical context tracking',
                  'Event-based memory views',
                  'Evolution insights'
                ]
              },
              {
                icon: '🔎',
                title: 'Smart Search',
                desc: 'AI-powered semantic search with filters',
                color: 'from-orange-500 to-red-500',
                items: [
                  'Semantic AI search',
                  'Advanced filtering',
                  'Instant results',
                  'Context-aware suggestions'
                ]
              },
              {
                icon: '📈',
                title: 'Analytics Dashboard',
                desc: 'Track knowledge health & engagement',
                color: 'from-red-500 to-rose-500',
                items: [
                  'Engagement metrics',
                  'Knowledge gaps detection',
                  'Usage trends',
                  'Performance insights'
                ]
              }
            ]
            .map((feature, index) => (
              <div
                key={index}
                ref={el => featureCardsRef.current[index] = el}
                className="relative p-8 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-lg border border-amber-500/20 rounded-2xl shadow-2xl transform-gpu preserve-3d perspective-1000"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-20 rounded-2xl blur-xl`} />
                <div className="relative z-10">
                  <div className={`text-5xl mb-6 inline-block p-4 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-3xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-300 text-lg mb-6">{feature.desc}</p>
                  <ul className="space-y-2">
                    {feature.items.map((item, i) => (
                      <li key={i} className="flex items-center text-gray-400">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-8">
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent animate-gradient-x">
              Ready to Transform Your Organization?
            </span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join forward-thinking companies preserving their intellectual capital
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <button onClick={() => navigate("/dashboard")} className="group relative px-10 py-5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-bold text-xl overflow-hidden">
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            <a href="tel:+1234567890" className="px-10 py-5 bg-transparent border-2 border-amber-500 rounded-xl font-bold text-xl hover:bg-amber-500/10 transition-all duration-300">
              📞 Schedule a Call
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-500">
            <p>© {new Date().getFullYear()} MemoryFlow Enterprise. Turning knowledge into power.</p>
            <p className="mt-2">Contact: Victor Wanyama • MemoryFlow Enterprise</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .preserve-3d {
          transform-style: preserve-3d;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: #111;
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #fbbf24, #f97316, #dc2626);
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f59e0b, #ea580c, #b91c1c);
        }
      `}</style>
    </div>
  );
};

export default Home;
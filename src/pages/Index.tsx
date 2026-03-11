import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, Shield, Clock, Users, ArrowRight } from 'lucide-react';
import bbaCampus4 from '@/assets/bbu-campus-4.jpg';
import bbaCampus5 from '@/assets/bbu-campus-5.png';
import bbaCampus6 from '@/assets/bbu-campus-6.png';

const campusImages = [bbaCampus4, bbaCampus5, bbaCampus6];

export default function Index() {
  const navigate = useNavigate();
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % campusImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-foreground">BBUC CDSS</h1>
              <p className="text-xs text-muted-foreground">Bishop Barham University College Kabale</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button onClick={() => navigate('/auth')}>Get Started <ArrowRight className="w-4 h-4 ml-2" /></Button>
          </div>
        </div>
      </header>

      {/* Hero with Background Slideshow */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background Images */}
        {campusImages.map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            style={{
              opacity: currentImage === index ? 1 : 0,
              backgroundImage: `url(${img})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        ))}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-foreground/60" />

        <div className="relative z-10 container mx-auto max-w-4xl text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium mb-6">
            <Heart className="w-4 h-4" /> Clinical Decision Support System
          </div>
          <h2 className="font-serif text-5xl md:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-lg">
            Smarter Clinical<br />Decisions
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 drop-shadow">
            Bishop Barham University College Kabale's Clinical Decision Support System. Report illnesses, receive guided clinical insights, and access medical records — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8 py-6">
              Report Illness <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')} className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20">
              Sign In to Portal
            </Button>
          </div>
          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {campusImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentImage === index ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Clock, title: 'Quick Check-In', desc: 'Report your illness online and join the queue without waiting in line.' },
              { icon: Shield, title: 'Secure Records', desc: 'Your medical records are safely stored and accessible only to authorized personnel.' },
              { icon: Users, title: 'Expert Staff', desc: 'Our trained medical staff are ready to attend to you with care and professionalism.' },
            ].map((f, i) => (
              <div key={i} className="bg-card rounded-2xl p-8 border border-border hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-border">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bishop Barham University College Kabale — Clinical Decision Support System</p>
        </div>
      </footer>
    </div>
  );
}

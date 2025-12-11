import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Brain, TrendingUp, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import Header from '../components/Header';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [typedText1, setTypedText1] = useState('');
  const [typedText2, setTypedText2] = useState('');

  // Typing animation
  useEffect(() => {
    const phrases1 = ['your YouTube history', 'your interests', 'your content', 'your behavior'];
    const phrases2 = ['your life path', 'who you are', 'your trajectory', 'your identity'];
    let index1 = 0;
    let index2 = 0;

    const typeAnimation = async () => {
      while (true) {
        const phrase1 = phrases1[index1 % phrases1.length];
        const phrase2 = phrases2[index2 % phrases2.length];

        // Type phrase 1 and 2
        for (let i = 0; i <= phrase1.length; i++) {
          setTypedText1(phrase1.substring(0, i));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        for (let i = 0; i <= phrase2.length; i++) {
          setTypedText2(phrase2.substring(0, i));
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Delete
        for (let i = phrase1.length; i >= 0; i--) {
          setTypedText1(phrase1.substring(0, i));
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        for (let i = phrase2.length; i >= 0; i--) {
          setTypedText2(phrase2.substring(0, i));
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        index1++;
        index2++;
      }
    };

    typeAnimation();
  }, []);

  return (
    <div className="min-h-screen bg-cyber-dark text-cyber-text">
      <Header />

      {/* Hero Section */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-20"
          style={{ backgroundImage: 'url(/hero-bg.png)' }}
        />
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyber-dark/80 via-cyber-dark/60 to-cyber-dark" />
        
        {/* Content */}
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold mb-8 leading-tight min-h-[180px] flex flex-col items-center justify-center">
            <span className="animate-fade-in-up">
              Understand how{' '}
              <span className="text-neon-blue inline-block min-w-[400px] text-left">{typedText1 || '\u00A0'}</span>
            </span>
            <span className="animate-fade-in-up animation-delay-200">
              shapes{' '}
              <span className="text-neon-purple inline-block min-w-[400px] text-left">{typedText2 || '\u00A0'}</span>
            </span>
          </h2>
          <p className="text-xl text-cyber-muted mb-12 max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
            By analyzing your YouTube watch history with AI, we help you discover patterns in your interests, visualize your life trajectory, and understand what truly matters to you.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-green text-white font-bold text-lg rounded-lg hover:shadow-xl hover:shadow-neon-purple/50 transition-all inline-flex items-center gap-2 animate-fade-in-up animation-delay-600"
          >
            Start your free journey
            <ArrowRight size={24} />
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-cyber-grey/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-neon-blue">
                Visualize Your Mind Map
              </h3>
              <p className="text-lg text-cyber-muted mb-6">
                See your interests as an interactive galaxy of nodes. Each video you've watched becomes a point of light, connected to others through shared themes and categories.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Interactive force-directed graph visualization</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>6 life dimensions: Career, Spiritual, Health, Social, Intellectual, Entertainment</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Discover hidden connections in your interests</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg p-8 aspect-square flex items-center justify-center overflow-hidden">
              <img src="/mind-bg.png" alt="Mind Map Visualization" className="w-full h-full object-cover rounded" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
            <div className="order-2 md:order-1 bg-[#1E1E1E] border border-gray-800 rounded-lg p-8 aspect-square flex items-center justify-center overflow-hidden">
              <img src="/trajectory-bg.png" alt="Life Trajectory Analytics" className="w-full h-full object-cover rounded" />
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-3xl font-bold mb-4 text-neon-purple">
                Track Your Life Trajectory
              </h3>
              <p className="text-lg text-cyber-muted mb-6">
                See how your interests evolve over time. Watch as your "Career Mountain" rises and your "Spiritual Valley" deepens, visualizing the phases of your life journey.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Beautiful time-series analytics dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Monthly trend analysis with stacked area charts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Discover your dominant archetype (Builder, Seeker, Warrior, etc.)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4 text-neon-green">
                AI-Powered Categorization
              </h3>
              <p className="text-lg text-cyber-muted mb-6">
                Our AI automatically analyzes every video title in your YouTube history and categorizes it into meaningful life dimensions. No manual tagging required.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Powered by Google Gemini AI</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Smart categorization into 6 life dimensions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                  <span>Instant insights from thousands of videos</span>
                </li>
              </ul>
            </div>
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg p-8 aspect-square flex items-center justify-center overflow-hidden">
              <img src="/aicat-bg.png" alt="AI-Powered Categorization" className="w-full h-full object-cover rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-4xl font-bold mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-cyber-grey border border-neon-blue/30 rounded-lg">
              <div className="text-5xl font-bold text-neon-blue mb-4">1</div>
              <h4 className="text-xl font-semibold mb-3">Upload Your History</h4>
              <p className="text-cyber-muted">
                Download your YouTube watch history from Google Takeout and upload the JSON file.
              </p>
            </div>
            <div className="p-6 bg-cyber-grey border border-neon-purple/30 rounded-lg">
              <div className="text-5xl font-bold text-neon-purple mb-4">2</div>
              <h4 className="text-xl font-semibold mb-3">AI Analyzes</h4>
              <p className="text-cyber-muted">
                Our AI categorizes each video into life dimensions automatically.
              </p>
            </div>
            <div className="p-6 bg-cyber-grey border border-neon-green/30 rounded-lg">
              <div className="text-5xl font-bold text-neon-green mb-4">3</div>
              <h4 className="text-xl font-semibold mb-3">Explore Insights</h4>
              <p className="text-cyber-muted">
                Navigate your Mind Map and Analytics dashboard to discover patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-neon-blue/10 via-neon-purple/10 to-neon-green/10">
        <div className="container mx-auto max-w-3xl text-center">
          <h3 className="text-4xl font-bold mb-6">
            Ready to discover yourself?
          </h3>
          <p className="text-xl text-cyber-muted mb-8">
            Start your journey of self-discovery today. Completely free to use.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-white text-gray-900 font-bold text-xl rounded-lg hover:bg-gray-100 transition-all shadow-xl"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="container mx-auto text-center text-cyber-muted">
          <p className="mb-4">
            <strong className="text-cyber-text">Identity Compass</strong> - Understand your life trajectory through data
          </p>
          <p className="text-sm">
            Made with ❤️ for self-discovery • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { User, Briefcase, DollarSign, FileText, BarChart2, CheckCircle, ArrowRight, Loader, UploadCloud, ChevronDown, AlertTriangle, TrendingUp, Target, Shield, Zap, Award, Info, MessageSquare, X, Send } from 'lucide-react';
import { LineChart, PieChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Pie, Cell, Line } from 'recharts';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// --- Backend API URL ---
// IMPORTANT: Replace this with your live Render URL before final deployment.
const BACKEND_URL = 'https://fuse-0zhq.onrender.com';

// --- App Context ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('register');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [formData, setFormData] = useState({
        personal: { firstName: '', lastName: '', email: '', age: '' },
        business: { businessName: '', industry: '', businessStage: '', yearsExperience: '', educationLevel: '', revenueProjection: '' },
        financials: { monthlyIncome: '', monthlyExpenses: '', savingsAmount: '', debtAmount: '' },
    });
    const [scoreData, setScoreData] = useState(null); // Will hold the entire score object from backend

    useEffect(() => {
        if (!auth) {
            setError("Firebase is not configured. Please check your setup.");
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUserId(currentUser.uid);
                const userDocRef = doc(db, "artifacts", appId, "users", currentUser.uid);
                try {
                    const docSnap = await getDoc(userDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setFormData(prev => ({ ...prev, ...data }));
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                    setError("Could not retrieve your profile. Please try again later.");
                }
                setLoading(false);
            } else {
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) {
                    try {
                        await signInWithCustomToken(auth, token);
                    } catch (err) {
                        console.error("Custom token sign-in failed:", err);
                        setError("Authentication failed.");
                        setLoading(false);
                    }
                } else {
                    try {
                        await signInAnonymously(auth);
                    } catch (err) {
                        console.error("Anonymous sign-in failed:", err);
                        setError("Anonymous authentication failed.");
                        setLoading(false);
                    }
                }
            }
        });
        return () => unsubscribe();
    }, []);


    const value = { page, setPage, loading, error, formData, setFormData, scoreData, setScoreData, userId };
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- Main App Component ---
export default function App() {
    return (
        <AppProvider>
            <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
                <ParticleBackground />
                <MainContent />
            </div>
        </AppProvider>
    );
}

const MainContent = () => {
    const { page, loading, error } = useContext(AppContext);

    if (loading) return <LoadingScreen />;
    if (error) return <ErrorDisplay message={error} />;

    return (
        <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {page === 'register' && <RegistrationPage />}
                {page === 'business' && <BusinessProfilePage />}
                {page === 'financials' && <FinancialDataPage />}
                {page === 'score' && <ScorePage />}
                {page === 'dashboard' && <AIDashboard />}
            </motion.div>
        </AnimatePresence>
    );
};

// --- Pages & Core Components ---

const RegistrationPage = () => {
    const { setPage, formData, setFormData } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.personal);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormData(prev => ({ ...prev, personal: localData }));
        setPage('business');
    };

    return (
        <FormWrapper title="Personal Information" icon={<User />}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField name="firstName" label="First Name" type="text" value={localData.firstName} onChange={handleChange} />
                <InputField name="lastName" label="Last Name" type="text" value={localData.lastName} onChange={handleChange} />
                <InputField name="email" label="Email Address" type="email" value={localData.email} onChange={handleChange} />
                <InputField name="age" label="Age" type="number" value={localData.age} onChange={handleChange} />
                <button type="submit" className="w-full bg-[#00ff88] text-gray-900 font-bold py-3 rounded-lg hover:bg-white transition-all duration-300">
                    Next: Business Profile <ArrowRight className="inline ml-2" />
                </button>
            </form>
        </FormWrapper>
    );
};

const BusinessProfilePage = () => {
    const { setPage, formData, setFormData } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.business);
    const businessStages = ['Idea Stage', 'Foundation', 'Prototype Development', 'MVP Ready', 'Early Customers', 'Revenue Generating', 'Investors Secured', 'Scaling Phase', 'Established Business'];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormData(prev => ({ ...prev, business: localData }));
        setPage('financials');
    };

    return (
        <FormWrapper title="Business Profile" icon={<Briefcase />}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField name="businessName" label="Business Name" type="text" value={localData.businessName} onChange={handleChange} />
                <InputField name="industry" label="Industry" type="text" value={localData.industry} onChange={handleChange} />
                <SelectField name="businessStage" label="Business Stage" options={businessStages} value={localData.businessStage} onChange={handleChange} />
                <InputField name="yearsExperience" label="Years of Relevant Experience" type="number" value={localData.yearsExperience} onChange={handleChange} />
                <InputField name="educationLevel" label="Highest Education Level" type="text" value={localData.educationLevel} onChange={handleChange} />
                <InputField name="revenueProjection" label="12-Month Revenue Projection ($)" type="number" value={localData.revenueProjection} onChange={handleChange} />
                <button type="submit" className="w-full bg-[#00ff88] text-gray-900 font-bold py-3 rounded-lg hover:bg-white transition-all duration-300">
                    Next: Financial Data <ArrowRight className="inline ml-2" />
                </button>
            </form>
        </FormWrapper>
    );
};


const FinancialDataPage = () => {
    const { setPage, formData, setFormData, setScoreData } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.financials);
    const [isCalculating, setIsCalculating] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalData(prev => ({ ...prev, [name]: value ? parseFloat(value) : '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsCalculating(true);
        const updatedFormData = { ...formData, financials: localData };
        setFormData(updatedFormData);

        try {
            const response = await fetch(`${BACKEND_URL}/api/calculate-score-gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFormData)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Failed to calculate score. Status: ${response.status}. Body: ${errorBody}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }

            setScoreData(result);
            setPage('score');

        } catch (err) {
            console.error(err);
            alert(`Error calculating score: ${err.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <FormWrapper title="Financial Data" icon={<DollarSign />}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField name="monthlyIncome" label="Average Monthly Income ($)" type="number" value={localData.monthlyIncome} onChange={handleChange} />
                <InputField name="monthlyExpenses" label="Average Monthly Expenses ($)" type="number" value={localData.monthlyExpenses} onChange={handleChange} />
                <InputField name="savingsAmount" label="Total Savings Amount ($)" type="number" value={localData.savingsAmount} onChange={handleChange} />
                <InputField name="debtAmount" label="Total Debt (excluding mortgage)" type="number" value={localData.debtAmount} onChange={handleChange} />
                <button type="submit" disabled={isCalculating} className="w-full bg-[#00ff88] text-gray-900 font-bold py-3 rounded-lg hover:bg-white transition-all duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isCalculating ? <Loader className="animate-spin mx-auto" /> : <>Calculate My YECS Score <ArrowRight className="inline ml-2" /></>}
                </button>
            </form>
        </FormWrapper>
    );
};

const ScorePage = () => {
    const { scoreData, setPage } = useContext(AppContext);
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        if (scoreData?.yecs_score) {
            const controls = animate(0, scoreData.yecs_score, {
                duration: 2,
                onUpdate: (latest) => setDisplayScore(Math.round(latest)),
            });
            return () => controls.stop();
        }
    }, [scoreData]);

    if (!scoreData) return <LoadingScreen text="Finalizing your score..." />;

    const getScoreColor = (s) => {
        if (s < 580) return "text-red-500";
        if (s < 670) return "text-yellow-500";
        if (s < 740) return "text-blue-400";
        return "text-[#00ff88]";
    };

    const scoreComponents = [
        { name: "Business Viability", weight: "25%", color: "border-l-[#00ff88]" },
        { name: "Payment History", weight: "20%", color: "border-l-[#0088ff]" },
        { name: "Financial Management", weight: "18%", color: "border-l-[#ff0088]" },
        { name: "Personal Credit", weight: "15%", color: "border-l-yellow-400" },
        { name: "Education Background", weight: "12%", color: "border-l-purple-400" },
        { name: "Social Verification", weight: "10%", color: "border-l-pink-400" },
    ];

    return (
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
            <h2 className="text-3xl font-bold mb-4">Your YECS Score is Ready</h2>
            <p className="text-gray-400 mb-8 max-w-md text-center">{scoreData.reasoning}</p>

            <div className="relative w-64 h-64 flex items-center justify-center">
                <motion.div className="absolute inset-0 border-8 border-gray-700 rounded-full"></motion.div>
                <motion.div className="absolute inset-0 border-8 border-[#00ff88] rounded-full" initial={{ pathLength: 0 }} animate={{ pathLength: (scoreData.yecs_score || 0) / 850 }} transition={{ duration: 2, ease: "easeInOut" }} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}></motion.div>
                <div className="text-center">
                    <h3 className={`text-7xl font-bold ${getScoreColor(displayScore)}`}>{displayScore}</h3>
                    <p className="text-gray-400">Out of 850</p>
                </div>
            </div>

            <div className="mt-12 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-center">Score Breakdown</h3>
                <div className="space-y-3">
                    {scoreComponents.map((comp, i) => (
                        <motion.div key={comp.name} className={`glass-card p-3 border-l-4 ${comp.color}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.1 }}>
                            <div className="flex justify-between items-center"><span className="font-semibold">{comp.name}</span><span className="text-gray-300">{comp.weight}</span></div>
                        </motion.div>
                    ))}
                </div>
            </div>
             <button onClick={() => setPage('dashboard')} className="mt-8 bg-[#0088ff] text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-white hover:text-gray-900 transition-all duration-300">
                View AI Advisor Dashboard <ArrowRight className="inline ml-2" />
            </button>
        </div>
    );
};

const AIDashboard = () => {
    const { scoreData, formData } = useContext(AppContext);
    const [insights, setInsights] = useState(null);
    const [isLoadingInsights, setIsLoadingInsights] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoadingInsights(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/ai-insights-gemini`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, ...scoreData })
                });
                if (!response.ok) throw new Error('Failed to fetch insights.');
                const result = await response.json();
                setInsights(result);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoadingInsights(false);
            }
        };
        if (formData && scoreData) {
            fetchInsights();
        }
    }, [formData, scoreData]);

    if (isLoadingInsights || !insights) {
        return <LoadingScreen text="Generating AI Insights..." />;
    }

    const cashFlow = (formData.financials.monthlyIncome || 0) - (formData.financials.monthlyExpenses || 0);
    const dti = formData.financials.monthlyIncome > 0 ? (((formData.financials.debtAmount || 0) / 12) / formData.financials.monthlyIncome) * 100 : 0;

    const userData = {
        score: scoreData.yecs_score,
        riskLevel: scoreData.risk_level,
        businessStage: formData.business.businessStage,
        cashFlow,
        dti: dti.toFixed(2),
    };

    const iconMap = {
        "SBA Microloan": <Award className="text-yellow-400" />,
        "Business Line of Credit": <Zap className="text-blue-400" />,
        "Fintech Term Loan": <Briefcase className="text-purple-400" />,
    };

    return (
        <div className="relative z-10 min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                 <h1 className="text-3xl font-bold text-white mb-8">AI Financial Advisor</h1>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            className="bg-blue-900/50 border border-blue-500 text-blue-200 p-4 rounded-xl flex items-center space-x-4 glass-card"
                            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        >
                            <Info size={24} />
                            <p className="text-sm font-medium">{insights.marketAlert}</p>
                        </motion.div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Loan Recommendations</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {insights.loanRecommendations.map((loan, i) => (
                                    <motion.div
                                        key={i}
                                        className="glass-card p-4 flex flex-col justify-between"
                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.1 }}
                                    >
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                {iconMap[loan.type] || <DollarSign />}
                                                <h3 className="font-bold text-lg">{loan.type}</h3>
                                            </div>
                                            <p className="text-sm text-gray-400 mb-3">{loan.reason}</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-[#00ff88]">{loan.rate} <span className="text-sm font-normal text-gray-300">APR</span></p>
                                            <p className="text-sm text-gray-300">Up to {loan.amount}</p>
                                            <button className="w-full mt-3 bg-[#0088ff] text-white font-bold py-2 rounded-lg text-sm hover:bg-white hover:text-gray-900 transition-all duration-300">
                                                Learn More
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="glass-card p-6 text-center">
                            <h3 className="text-lg font-semibold text-gray-300 mb-1">Your YECS Score</h3>
                            <p className="text-6xl font-bold text-[#00ff88]">{userData.score}</p>
                            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
                                <div className="bg-[#00ff88] h-2.5 rounded-full" style={{ width: `${(userData.score / 850) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="glass-card p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Credit Improvement Plan</h3>
                            <ul className="space-y-4">
                                {insights.creditImprovements.map((item, i) => (
                                    <li key={i}>
                                        <p className="font-semibold flex items-center"><Target size={16} className="mr-2 text-[#00ff88]" /> {item.title}</p>
                                        <p className="text-sm text-gray-300 pl-6">{item.action}</p>
                                        <p className="text-xs text-green-400 pl-6 font-mono">Est. Impact: {item.impact}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Utility Components ---
const FormWrapper = ({ title, icon, children }) => (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div className="w-full max-w-md glass-card p-8 shadow-2xl shadow-black/50" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}>
            <div className="text-center mb-8">
                <div className="inline-block bg-gray-700 p-3 rounded-full mb-4">{React.cloneElement(icon, { className: "text-[#00ff88]", size: 28 })}</div>
                <h2 className="text-2xl font-bold">{title}</h2>
            </div>
            {children}
        </motion.div>
    </div>
);

const InputField = ({ name, label, type, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input type={type} name={name} id={name} value={value || ''} onChange={onChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#00ff88] focus:border-[#00ff88] outline-none transition-all duration-300" />
    </div>
);

const SelectField = ({ name, label, options, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <div className="relative">
            <select name={name} id={name} value={value || ''} onChange={onChange} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 appearance-none focus:ring-2 focus:ring-[#00ff88] focus:border-[#00ff88] outline-none transition-all duration-300">
                <option value="">Select an option</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

const ParticleBackground = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        let particles = [];
        const mouse = { x: null, y: null };
        const handleMouseMove = (event) => { mouse.x = event.x; mouse.y = event.y; };
        window.addEventListener('mousemove', handleMouseMove);
        const handleResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; init(); };
        window.addEventListener('resize', handleResize);

        class Particle {
            constructor(x, y, size, color, speedX, speedY) { this.x = x; this.y = y; this.size = size; this.color = color; this.speedX = speedX; this.speedY = speedY; }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false); ctx.fillStyle = this.color; ctx.fill(); }
            update() {
                if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
                if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;
                this.x += this.speedX; this.y += this.speedY;
                if (mouse.x && mouse.y) {
                    let dx = mouse.x - this.x; let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 50) { this.x += dx / 20; this.y += dy / 20; }
                }
            }
        }
        function init() {
            particles = [];
            for (let i = 0; i < 100; i++) {
                let size = Math.random() * 2 + 1;
                let x = Math.random() * (canvas.width - size * 2) + size;
                let y = Math.random() * (canvas.height - size * 2) + size;
                let speedX = (Math.random() * 0.5) - 0.25; let speedY = (Math.random() * 0.5) - 0.25;
                particles.push(new Particle(x, y, size, '#00ff88', speedX, speedY));
            }
        }
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(); }
            animationFrameId = requestAnimationFrame(animate);
        }
        init(); animate();
        return () => { window.cancelAnimationFrame(animationFrameId); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('resize', handleResize); };
    }, []);
    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0" />;
};

const LoadingScreen = ({ text = "INITIALIZING YECS..." }) => (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
        <Loader className="text-[#00ff88] animate-spin" size={64} />
        <p className="text-lg mt-4 tracking-widest">{text}</p>
    </div>
);

const ErrorDisplay = ({ message }) => (
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div className="w-full max-w-md glass-card p-8 text-center" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <AlertTriangle className="text-red-400 mx-auto" size={48} />
            <h2 className="text-2xl font-bold mt-4 text-red-300">An Error Occurred</h2>
            <p className="text-red-200 mt-2">{message}</p>
        </motion.div>
    </div>
);

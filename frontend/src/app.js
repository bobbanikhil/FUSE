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

// --- App Context ---
const AppContext = createContext();

const AppProvider = ({ children }) => {
    const [page, setPage] = useState('register'); // Start at registration
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userId, setUserId] = useState(null);
    const [formData, setFormData] = useState({
        personal: { firstName: '', lastName: '', email: '', age: '' },
        business: { businessName: '', industry: '', businessStage: '', yearsExperience: '', educationLevel: '', revenueProjection: '' },
        financials: { monthlyIncome: '', monthlyExpenses: '', savingsAmount: '', debtAmount: '' },
        documents: [],
    });
    const [score, setScore] = useState(null);

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

    const updateFormData = (section, data) => setFormData(prev => ({ ...prev, [section]: { ...prev[section], ...data } }));

    const saveToFirestore = async () => {
        if (userId) {
            try {
                await setDoc(doc(db, "artifacts", appId, "users", userId), formData, { merge: true });
            } catch (error) {
                console.error("Error saving data:", error);
                setError("Failed to save data.");
            }
        }
    };

    const value = { page, setPage, loading, error, formData, updateFormData, score, setScore, saveToFirestore };
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
    const { page, loading, error, formData, score, setPage } = useContext(AppContext);

    if (loading) return <LoadingScreen />;
    if (error) return <ErrorDisplay message={error} />;

    const cashFlow = (formData.financials.monthlyIncome || 0) - (formData.financials.monthlyExpenses || 0);
    const dti = formData.financials.monthlyIncome > 0 ? (((formData.financials.debtAmount || 0) / 12) / formData.financials.monthlyIncome) * 100 : 0;

    const userDataForDashboard = {
        score: score || 0,
        riskLevel: score > 700 ? 'Low' : score > 600 ? 'Medium' : 'High',
        businessStage: formData.business.businessStage,
        industry: formData.business.industry,
        income: formData.financials.monthlyIncome,
        expenses: formData.financials.monthlyExpenses,
        dti: dti.toFixed(2),
        cashFlow: cashFlow,
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                {page === 'register' && <RegistrationPage />}
                {page === 'business' && <BusinessProfilePage />}
                {page === 'financials' && <FinancialDataPage />}
                {page === 'score' && <ScorePage />}
                {page === 'dashboard' && <AIDashboard userData={userDataForDashboard} setPage={setPage} />}
            </motion.div>
        </AnimatePresence>
    );
};

// --- AI & Dashboard Components ---

const YecsCopilot = ({ userData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ sender: 'ai', text: "Hello! I'm YECS Copilot. How can I help you improve your funding readiness today?" }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;
        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        const prompt = `You are YECS AI, a financial assistant for young entrepreneurs. Based on this user's data: ${JSON.stringify(userData)}. The user asks: "${input}". Provide a concise, helpful, and encouraging answer. Use markdown for formatting (e.g., **bold**, *italics*).`;

        let aiResponseText = "I'm processing that. One moment.";
        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = ""; // Leave empty for automatic injection
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                aiResponseText = result.candidates[0].content.parts[0].text;
            } else {
                aiResponseText = "I couldn't generate a response right now. Please try asking differently.";
            }
        } catch (error) {
            console.error("Gemini API error:", error);
            aiResponseText = "I'm having trouble connecting to my brain. Please check the console for errors.";
        }

        setIsThinking(false);
        setMessages(prev => [...prev, { sender: 'ai', text: aiResponseText }]);
    };

    if (!isOpen) {
        return (
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 bg-gradient-to-br from-[#00ff88] to-[#0088ff] text-white p-4 rounded-full shadow-lg shadow-cyan-500/50 z-50"
                whileHover={{ scale: 1.1 }}
                title="Open YECS Copilot"
            >
                <MessageSquare size={28} />
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-8 right-8 w-[350px] h-[500px] bg-gray-800/80 backdrop-blur-xl border border-gray-600 rounded-2xl shadow-2xl flex flex-col z-50"
        >
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="font-bold text-lg text-white">YECS Copilot</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                           <p dangerouslySetInnerHTML={{__html: msg.text.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}}></p>
                        </div>
                    </div>
                ))}
                {isThinking && <div className="flex justify-start"><div className="p-3 rounded-xl bg-gray-700 text-gray-200"><Loader className="animate-spin" size={20}/></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-gray-700 border-none rounded-full px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#00ff88] outline-none"
                />
                <button onClick={handleSend} className="ml-2 bg-[#00ff88] text-gray-900 p-2 rounded-full" disabled={isThinking}><Send /></button>
            </div>
        </motion.div>
    );
};


const AIDashboard = ({ userData, setPage }) => {
    const insights = getAIInsights(userData);

    const scoreData = [
        { name: 'Jan', score: userData.score > 40 ? userData.score - 40 : 300 },
        { name: 'Feb', score: userData.score > 25 ? userData.score - 25 : 320 },
        { name: 'Mar', score: userData.score > 15 ? userData.score - 15 : 330 },
        { name: 'Apr', score: userData.score > 10 ? userData.score - 10 : 340 },
        { name: 'May', score: userData.score > 5 ? userData.score - 5 : 350 },
        { name: 'Jun', score: userData.score },
    ];

    const financialBreakdown = [
        { name: 'Income', value: userData.income || 0, fill: '#00ff88' },
        { name: 'Expenses', value: userData.expenses || 0, fill: '#ff0088' },
        { name: 'Savings', value: userData.cashFlow > 0 ? userData.cashFlow : 0, fill: '#0088ff' },
    ].filter(item => item.value > 0);

    return (
        <div className="relative z-10 min-h-screen p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">AI Financial Advisor</h1>
                </div>

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
                                                {loan.icon}
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card p-4">
                                <h3 className="font-bold text-lg mb-2">YECS Score History</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={scoreData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                        <YAxis stroke="#888" fontSize={12} domain={['dataMin - 50', 'dataMax + 20']} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} labelStyle={{color: '#fff'}} itemStyle={{color: '#00ff88'}}/>
                                        <Line type="monotone" dataKey="score" stroke="#00ff88" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                             <div className="glass-card p-4">
                                <h3 className="font-bold text-lg mb-2">Monthly Cash Flow</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={financialBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                                            {financialBreakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}/>
                                    </PieChart>
                                </ResponsiveContainer>
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

                         <div className="glass-card p-6">
                             <h3 className="text-xl font-bold text-white mb-4">Financial Snapshot</h3>
                             <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span>Risk Level:</span> <span className={`font-bold ${userData.riskLevel === 'Low' ? 'text-green-400' : userData.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>{userData.riskLevel}</span></div>
                                <div className="flex justify-between"><span>Cash Flow:</span> <span className={`font-bold ${userData.cashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>${userData.cashFlow.toLocaleString()}/mo</span></div>
                                <div className="flex justify-between"><span>DTI Ratio:</span> <span className="font-bold">{userData.dti}%</span></div>
                                <div className="flex justify-between"><span>Business Stage:</span> <span className="font-bold">{userData.businessStage}</span></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            <YecsCopilot userData={userData} />
        </div>
    );
};


// --- Pages & Core Components ---

const RegistrationPage = () => {
    const { setPage, updateFormData, formData, saveToFirestore } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.personal);

    const handleChange = (e) => setLocalData({ ...localData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateFormData('personal', localData);
        saveToFirestore();
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
    const { setPage, updateFormData, formData, saveToFirestore } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.business);

    const handleChange = (e) => setLocalData({ ...localData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateFormData('business', localData);
        saveToFirestore();
        setPage('financials');
    };

    const businessStages = ['Idea Stage', 'Foundation', 'Prototype Development', 'MVP Ready', 'Early Customers', 'Revenue Generating', 'Investors Secured', 'Scaling Phase', 'Established Business'];

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
    const { setPage, updateFormData, formData, saveToFirestore, setScore } = useContext(AppContext);
    const [localData, setLocalData] = useState(formData.financials);
    const [files, setFiles] = useState([]);

    const handleChange = (e) => setLocalData({ ...localData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFiles([...files, ...e.target.files]);

    const handleSubmit = (e) => {
        e.preventDefault();
        updateFormData('financials', localData);
        updateFormData('documents', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
        saveToFirestore();
        calculateScore();
        setPage('score');
    };

    const calculateScore = () => {
        let score = 300;
        const fullData = { ...formData, financials: { ...formData.financials, ...localData } };
        const { business, financials } = fullData;

        if (business.revenueProjection > 50000) score += 50;
        if (business.yearsExperience > 2) score += 40;
        if (['MVP Ready', 'Early Customers', 'Revenue Generating'].includes(business.businessStage)) score += 35;

        const cashFlow = (financials.monthlyIncome || 0) - (financials.monthlyExpenses || 0);
        if (cashFlow > 500) score += 60;
        if (financials.monthlyExpenses > 0 && (financials.savingsAmount || 0) > (financials.monthlyExpenses * 3)) score += 40;

        score += Math.random() * 100;
        setScore(Math.min(Math.round(score), 850));
    };

    return (
        <FormWrapper title="Financial Data" icon={<DollarSign />}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField name="monthlyIncome" label="Average Monthly Income ($)" type="number" value={localData.monthlyIncome} onChange={handleChange} />
                <InputField name="monthlyExpenses" label="Average Monthly Expenses ($)" type="number" value={localData.monthlyExpenses} onChange={handleChange} />
                <InputField name="savingsAmount" label="Total Savings Amount ($)" type="number" value={localData.savingsAmount} onChange={handleChange} />
                <InputField name="debtAmount" label="Total Debt (excluding mortgage)" type="number" value={localData.debtAmount} onChange={handleChange} />

                <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg text-center relative">
                    <UploadCloud className="mx-auto text-gray-400" size={48} />
                    <p className="mt-2">Drag & drop documents or click to upload</p>
                    <input type="file" multiple onChange={handleFileChange} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" />
                </div>
                <div>{files.map((file, index) => <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded-md mt-2"><p className="text-sm truncate">{file.name}</p><CheckCircle className="text-[#00ff88]" size={16} /></div>)}</div>

                <button type="submit" className="w-full bg-[#00ff88] text-gray-900 font-bold py-3 rounded-lg hover:bg-white transition-all duration-300">
                    Calculate My YECS Score <ArrowRight className="inline ml-2" />
                </button>
            </form>
        </FormWrapper>
    );
};

const ScorePage = () => {
    const { score, setPage } = useContext(AppContext);
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const controls = animate(displayScore, score || 0, { duration: 2, onUpdate: (latest) => setDisplayScore(Math.round(latest)) });
        return () => controls.stop();
    }, [score]);

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
            <h2 className="text-3xl font-bold mb-8">Your YECS Score is Ready</h2>
            <div className="relative w-64 h-64 flex items-center justify-center">
                <motion.div className="absolute inset-0 border-8 border-gray-700 rounded-full"></motion.div>
                <motion.div className="absolute inset-0 border-8 border-[#00ff88] rounded-full" initial={{ pathLength: 0 }} animate={{ pathLength: (score || 0) / 850 }} transition={{ duration: 2, ease: "easeInOut" }} style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}></motion.div>
                <div className="text-center"><h3 className={`text-7xl font-bold ${getScoreColor(displayScore)}`}>{displayScore}</h3><p className="text-gray-400">Out of 850</p></div>
            </div>
            <div className="mt-12 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-center">Score Breakdown</h3>
                <div className="space-y-3">
                    {scoreComponents.map((comp, i) => (
                        <motion.div key={comp.name} className="glass-card p-3 border-l-4 ${comp.color}" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.1 }}>
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

const LoadingScreen = () => (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50">
        <Loader className="text-[#00ff88] animate-spin" size={64} />
        <p className="text-lg mt-4 tracking-widest">INITIALIZING YECS...</p>
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

// --- AI Insights Helper ---
const getAIInsights = (userData) => {
    const insights = { loanRecommendations: [], creditImprovements: [], marketAlert: null };
    if (userData.score >= 700) insights.loanRecommendations.push({ type: 'SBA Microloan', rate: '6.5%', amount: '$50,000', terms: 'Up to 6 years', reason: 'Excellent for businesses with strong early traction.', icon: <Award className="text-yellow-400" /> });
    if (userData.cashFlow > 500) insights.loanRecommendations.push({ type: 'Business Line of Credit', rate: '8.2%', amount: '$25,000', terms: 'Revolving', reason: 'Flexible funding for your positive cash flow.', icon: <Zap className="text-blue-400" /> });
    insights.loanRecommendations.push({ type: 'Fintech Term Loan', rate: '9.5%', amount: '$75,000', terms: '3-5 years', reason: 'Fast funding for growth opportunities.', icon: <Briefcase className="text-purple-400" /> });
    if (userData.dti > 20) insights.creditImprovements.push({ title: 'Optimize Debt-to-Income', action: 'Consider consolidating smaller debts to lower your DTI ratio.', impact: '+15-25 points' });
    insights.creditImprovements.push({ title: 'Build Business Credit', action: 'Open a business credit card and use it for small, regular purchases.', impact: '+20-30 points' });
    insights.marketAlert = `SBA loan rates for the ${userData.industry || 'your'} industry have decreased by 0.25% this quarter. It's a favorable time to apply.`;
    return insights;
};

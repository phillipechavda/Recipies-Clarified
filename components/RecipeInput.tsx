import React, { useState, useRef, useEffect } from 'react';
import { ChefHat, ArrowRight, Loader2, Sparkles, Image as ImageIcon, Mic, Type, StopCircle, Scale, Users, History, Clock } from 'lucide-react';
import { AnalysisInput, UserPreferences, UnitPreference, HistoryItem } from '../types';

interface Props {
  onAnalyze: (input: AnalysisInput, prefs: UserPreferences) => void;
  isLoading: boolean;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  initialState?: { input: AnalysisInput | null, prefs: UserPreferences };
}

const DEMO_RECIPE = `Spaghetti Carbonara`;

const RecipeInput: React.FC<Props> = ({ onAnalyze, isLoading, history, onLoadHistory, initialState }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'audio'>('text');
  const [text, setText] = useState('');
  const [preferences, setPreferences] = useState<UserPreferences>({ units: 'METRIC', servings: 2 });
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Restore state if available
  useEffect(() => {
    if (initialState) {
      setPreferences(initialState.prefs);
      if (initialState.input) {
        setActiveTab(initialState.input.type);
        if (initialState.input.type === 'text') {
          setText(initialState.input.content);
        } else if (initialState.input.type === 'image') {
          // Can't easily restore file object, but we could restore preview if we stored it. 
          // For now, we assume user re-uploads or we just keep text persistence primarily.
        }
      }
    }
  }, [initialState]);

  // Helpers for file handling
  const fileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (activeTab === 'text' && text.trim()) {
      onAnalyze({ type: 'text', content: text }, preferences);
    } else if (activeTab === 'image' && imageFile) {
       const base64 = await fileToBase64(imageFile);
       onAnalyze({ type: 'image', content: base64, mimeType: imageFile.type }, preferences);
    }
  };

  const handleDemo = () => {
    setActiveTab('text');
    setText(DEMO_RECIPE);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        const base64 = await fileToBase64(audioBlob);
        onAnalyze({ type: 'audio', content: base64, mimeType: 'audio/webm' }, preferences);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleUnits = () => {
    setPreferences(prev => ({
      ...prev,
      units: prev.units === 'METRIC' ? 'IMPERIAL' : 'METRIC'
    }));
  };

  const adjustServings = (delta: number) => {
    setPreferences(prev => ({
      ...prev,
      servings: Math.max(1, prev.servings + delta)
    }));
  };

  const ensureVisibility = () => {
    // Scroll actions into center view when keyboard opens.
    // Using 'center' ensures it's pushed up enough to be visible above the keyboard.
    setTimeout(() => {
      actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const isInputEmpty = (activeTab === 'text' && !text.trim()) || (activeTab === 'image' && !imageFile) || (activeTab === 'audio' && isRecording);
  const isDisabled = isLoading || isInputEmpty;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* LEFT: Main Input */}
      <div className="flex-grow">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 h-full">
          <div className="p-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500"></div>
          <div className="p-6 md:p-8">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0 p-3 bg-orange-100 text-orange-600 rounded-xl">
                  <ChefHat size={24} />
                </div>
                <div>
                  <p className="text-slate-700 font-bold text-lg leading-snug">Send a recipe or dish name to see an easy-to-follow version.</p>
                </div>
              </div>
            </div>

            {/* Config Bar - Compact Layout */}
            <div className="flex flex-row flex-nowrap items-center gap-2 sm:gap-4 mb-6 p-2 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-x-auto">
               {/* Unit Toggle */}
              <button 
                onClick={toggleUnits}
                type="button"
                className="whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-orange-200 hover:text-orange-600 text-slate-600 text-sm font-semibold transition-colors shadow-sm"
              >
                <Scale size={16} />
                {preferences.units === 'METRIC' ? 'Metric (g, L, °C)' : 'Imperial (oz, lb, °F)'}
              </button>

              {/* Servings Counter */}
              <div className="whitespace-nowrap flex-shrink-0 flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
                 <Users size={16} className="text-slate-500 hidden sm:block" />
                 <span className="text-sm font-semibold text-slate-600">Servings:</span>
                 <div className="flex items-center gap-1">
                    <button type="button" onClick={() => adjustServings(-1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                    <span className="text-slate-800 font-bold w-6 text-center">{preferences.servings}</span>
                    <button type="button" onClick={() => adjustServings(1)} className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                 </div>
              </div>
            </div>

            {/* Input Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl mb-6">
              <button
                onClick={() => setActiveTab('text')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Type size={16} /> Text
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'image' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ImageIcon size={16} /> Image
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'audio' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Mic size={16} /> Voice
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* TEXT INPUT */}
              {activeTab === 'text' && (
                <div className="animate-fade-in">
                  <textarea
                    className="w-full h-32 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all outline-none resize-none text-slate-700 placeholder:text-slate-400"
                    placeholder="E.g. 'Beef Wellington' or paste full text..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onFocus={ensureVisibility}
                    onClick={ensureVisibility}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* IMAGE INPUT */}
              {activeTab === 'image' && (
                <div className="animate-fade-in h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden group">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <p className="bg-white/90 px-3 py-1 rounded-full text-xs font-bold text-slate-700 shadow-sm">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
                      <p className="text-sm text-slate-500 font-medium">Upload recipe photo</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* AUDIO INPUT */}
              {activeTab === 'audio' && (
                <div className="animate-fade-in h-32 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center gap-4">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={isLoading}
                      className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    >
                      <Mic size={28} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 animate-pulse"
                    >
                      <StopCircle size={28} />
                    </button>
                  )}
                  <p className="text-sm font-medium text-slate-600">
                    {isRecording ? "Listening..." : "Tap to record"}
                  </p>
                </div>
              )}

              {/* Actions - Always Horizontal */}
              <div ref={actionsRef} className="flex flex-row gap-3 justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleDemo}
                  className={`text-sm font-medium text-slate-500 hover:text-orange-500 flex items-center gap-1 transition-colors ${activeTab !== 'text' ? 'invisible' : ''}`}
                  disabled={isLoading}
                >
                  <Sparkles size={16} /> Try Demo
                </button>

                <button
                  type="submit"
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-2 px-8 py-3 rounded-xl font-semibold shadow-lg 
                    transition-all transform active:scale-95
                    ${isDisabled 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200 hover:from-orange-600 hover:to-red-600 hover:shadow-orange-300'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      Visualize <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT: History */}
      {history.length > 0 && (
        <div className="w-full md:w-80 flex-shrink-0 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full max-h-[600px] flex flex-col">
             <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <History size={18} className="text-slate-500" />
                <h3 className="font-bold text-slate-700">Recent Sessions</h3>
             </div>
             <div className="overflow-y-auto flex-grow p-4 space-y-3">
                {history.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => onLoadHistory(item)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-all group"
                  >
                    <div className="font-semibold text-slate-800 group-hover:text-orange-700 truncate">{item.title}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                       <Clock size={10} />
                       {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       <span>•</span>
                       <span>{item.data.servings} servings</span>
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeInput;
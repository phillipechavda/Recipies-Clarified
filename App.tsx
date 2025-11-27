import React, { useState } from 'react';
import RecipeInput from './components/RecipeInput';
import RecipeDiagram from './components/RecipeDiagram';
import { parseRecipeWithGemini, enrichElementWithGemini } from './services/geminiService';
import { RecipeGraph, AnalysisInput, UserPreferences, HistoryItem, RecipeNode, RecipeLink, ElementDetails } from './types';
import { UtensilsCrossed, AlertCircle, X, Sparkles, BookOpen, AlertTriangle, FlaskConical, Lightbulb, ChefHat, ArrowLeft, ImageOff } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RecipeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Side Panel State
  const [selectedElement, setSelectedElement] = useState<RecipeNode | RecipeLink | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [elementDetails, setElementDetails] = useState<ElementDetails | null>(null);
  const [imageError, setImageError] = useState(false);

  const [lastInput, setLastInput] = useState<AnalysisInput | null>(null);
  const [lastPrefs, setLastPrefs] = useState<UserPreferences>({ units: 'METRIC', servings: 2 });

  const handleAnalyze = async (input: AnalysisInput, prefs: UserPreferences) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedElement(null);
    setLastInput(input);
    setLastPrefs(prefs);

    try {
      const graphData = await parseRecipeWithGemini(input, prefs);
      setData(graphData);
      
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        title: graphData.title,
        timestamp: Date.now(),
        data: graphData
      };
      setHistory(prev => [newItem, ...prev].slice(0, 10));
    } catch (err) {
      setError("We couldn't process that. Please ensure your API key is valid and the input is clear.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleElementSelect = async (el: RecipeNode | RecipeLink | null) => {
    if (!el) {
      setSelectedElement(null);
      return;
    }
    
    setSelectedElement(el);
    setDetailLoading(true);
    setElementDetails(null);
    setImageError(false); 

    if (data) {
      try {
        const details = await enrichElementWithGemini(el, { recipeTitle: data.title });
        setElementDetails(details);
      } catch (e) {
        console.error("Failed to fetch details", e);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setData(item.data);
    setError(null);
    setSelectedElement(null);
  };

  const reset = () => {
    setData(null);
    setError(null);
    setSelectedElement(null);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'TIP': return <Lightbulb size={18} className="text-yellow-600" />;
      case 'WARNING': return <AlertTriangle size={18} className="text-red-600" />;
      case 'SCIENCE': return <FlaskConical size={18} className="text-purple-600" />;
      case 'SERVING': return <ChefHat size={18} className="text-green-600" />;
      default: return <Sparkles size={18} className="text-blue-600" />;
    }
  }

  const getSidePanelImage = () => {
    if (!selectedElement) return '';
    const isNode = 'label' in selectedElement;
    const name = isNode ? (selectedElement as RecipeNode).label : (selectedElement as RecipeLink).action;
    
    // Aggressive cleaning to ensure image hit
    const cleanName = name.replace(/\(.*\)/g, '').replace(/[0-9]/g, '')
      .replace(/\b(g|ml|oz|cups|tbsp|tsp|large|small)\b/gi, '')
      .trim() || 'cooking';
      
    const seed = name.replace(/[^a-z0-9]/gi, '');
    
    return `https://image.pollinations.ai/prompt/cinematic food photography of ${encodeURIComponent(cleanName)} in ${encodeURIComponent(data?.title || 'kitchen')}?width=600&height=300&nologo=true&seed=${seed}&model=flux`;
  };

  return (
    <div className="h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Global Header - Only show on input page */}
      {!data && (
        <header className="bg-white border-b border-slate-200 shrink-0 z-50 shadow-sm h-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
              <div className="bg-gradient-to-tr from-orange-500 to-rose-500 p-2 rounded-lg text-white shadow-lg shadow-orange-200 group-hover:scale-105 transition-transform">
                <UtensilsCrossed size={20} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-rose-600">
                Recipes Clarified
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 relative overflow-hidden">
        {!data ? (
          <div className="h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="animate-fade-in-up">
                
                <RecipeInput 
                  onAnalyze={handleAnalyze} 
                  isLoading={loading} 
                  history={history}
                  onLoadHistory={loadFromHistory}
                  initialState={{ input: lastInput, prefs: lastPrefs }}
                />

                {error && (
                  <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3 animate-shake shadow-sm">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col lg:flex-row max-w-7xl mx-auto lg:px-8 lg:py-4">
             {/* Left Column: Diagram */}
             <div className="flex-1 flex flex-col h-full min-w-0 bg-white lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-sm overflow-hidden relative">
               <div className="bg-white/95 border-b border-slate-200/60 py-3 px-4 flex items-center gap-3 shrink-0 z-10">
                 <button onClick={reset} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all border border-transparent hover:border-slate-200">
                   <ArrowLeft size={18} />
                 </button>
                 <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-none">{data.title}</h2>
                 </div>
               </div>
               
               <div className="flex-1 relative overflow-hidden">
                 <RecipeDiagram data={data} onSelectElement={handleElementSelect} />
               </div>
             </div>

             {/* Right Column: Side Panel */}
             <div className={`
                fixed inset-0 z-[60] lg:static lg:z-auto lg:w-96 lg:block lg:ml-6
                bg-white/95 lg:bg-white lg:rounded-xl lg:border lg:border-slate-200 lg:shadow-sm
                backdrop-blur-sm lg:backdrop-blur-none transition-transform duration-300
                ${selectedElement ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:block'}
             `}>
               <div className="h-full flex flex-col overflow-y-auto">
                 <div className="flex justify-between items-center p-4 lg:hidden sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-slate-100">
                   <span className="font-bold text-slate-400 uppercase text-xs">Details</span>
                   <button onClick={() => setSelectedElement(null)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
                 </div>

                 {!selectedElement ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6">
                     <BookOpen size={48} className="mb-4 opacity-20" />
                     <p>Click any ingredient or action step to see professional tips & details.</p>
                   </div>
                 ) : (
                   <div className="animate-fade-in flex flex-col h-full">
                     <div className="h-48 w-full shrink-0 relative bg-slate-100 overflow-hidden">
                        {!imageError ? (
                          <img 
                            src={getSidePanelImage()} 
                            alt="Detail Visual" 
                            className="w-full h-full object-cover animate-fade-in"
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400">
                             <ImageOff size={32} className="mb-2 opacity-50"/>
                             <span className="text-xs">Image unavailable</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                     </div>

                     <div className="p-6">
                        {detailLoading ? (
                          <div className="space-y-4">
                            <div className="h-8 bg-slate-200 rounded animate-pulse w-3/4"></div>
                            <div className="h-4 bg-slate-100 rounded animate-pulse w-full"></div>
                            <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6"></div>
                            <div className="mt-8 space-y-3">
                              <div className="h-24 bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
                              <div className="h-24 bg-slate-50 rounded-xl animate-pulse border border-slate-100"></div>
                            </div>
                          </div>
                        ) : elementDetails ? (
                          <>
                            <div className="mb-6">
                              <h3 className="text-2xl font-bold text-slate-800 mb-2 leading-tight">{elementDetails.title}</h3>
                              <p className="text-slate-600 leading-relaxed text-sm">{elementDetails.description}</p>
                            </div>
                            <div className="space-y-4 pb-10">
                              {elementDetails.sections.map((section, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-700 uppercase tracking-wide">
                                    {getIcon(section.icon)}
                                    {section.heading}
                                  </div>
                                  <p className="text-slate-600 text-sm leading-relaxed">
                                    {section.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-red-400">Could not load details.</p>
                        )}
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
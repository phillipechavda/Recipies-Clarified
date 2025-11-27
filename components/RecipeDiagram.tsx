
import React from 'react';
import { RecipeGraph } from '../types';
import { ChefHat } from 'lucide-react';

interface Props {
  data: RecipeGraph;
  onSelectElement: (el: any) => void;
}

const RecipeDiagram: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
              <ChefHat size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Recipe Analyzed</h3>
            <p className="text-slate-600">
              Successfully parsed <strong>{data.title}</strong> into <strong>{data.steps.length} linear steps</strong>.
            </p>
          </div>

          <div className="space-y-4 font-mono text-sm">
            {data.steps.map((step, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">Step {index + 1}</span>
                  <span className="font-bold text-blue-600">{step.action}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Inputs</span>
                    <ul className="mt-1 space-y-1">
                      {step.inputs.map((input, i) => (
                        <li key={i} className="text-slate-700 flex justify-between">
                          <span>{input.name}</span>
                          {input.quantity && <span className="text-slate-400 text-xs">{input.quantity}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Outputs</span>
                    <ul className="mt-1 space-y-1">
                      {step.outputs.map((output, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className={`${
                            output.type === 'FINAL' ? 'text-green-600 font-bold' : 
                            output.type === 'WASTE' ? 'text-slate-400 italic line-through' : 'text-slate-700'
                          }`}>
                            {output.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{output.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-slate-400 mt-8 text-center">
             Check if this linear sequence matches your "Timeline Action" expectations before we rebuild the visualization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeDiagram;

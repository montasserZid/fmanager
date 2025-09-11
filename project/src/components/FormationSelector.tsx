import React from 'react';
import { Formation } from './SquadManagement';
import { Grid3X3, ChevronDown } from 'lucide-react';

interface FormationSelectorProps {
  formations: Formation[];
  currentFormation: Formation;
  onFormationChange: (formation: Formation) => void;
}

export function FormationSelector({ 
  formations, 
  currentFormation, 
  onFormationChange 
}: FormationSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center gap-2 min-w-[120px]"
      >
        <Grid3X3 className="w-4 h-4" />
        {currentFormation.name}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[140px]">
          {formations.map((formation) => (
            <button
              key={formation.name}
              onClick={() => {
                onFormationChange(formation);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                currentFormation.name === formation.name 
                  ? 'bg-purple-600/20 text-purple-300' 
                  : 'text-white'
              }`}
            >
              {formation.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
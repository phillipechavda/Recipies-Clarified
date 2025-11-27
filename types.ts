
export enum NodeType {
  INGREDIENT = 'INGREDIENT', // Raw base ingredient
  STAGE = 'STAGE',           // Intermediate state
  FINAL = 'FINAL',           // The final dish
  WASTE = 'WASTE'            // Trash/Discard
}

export interface RecipeNode {
  id: string;
  type: NodeType;
  label: string;
  detail?: string;
}

export interface RecipeLink {
  source: string;
  target: string;
  action: string;
}

export interface RecipeStep {
  stepIndex: number;
  action: string;
  inputs: { name: string; quantity?: string }[];
  outputs: { name: string; type: NodeType }[];
}

export interface RecipeGraph {
  title: string;
  description: string;
  servings: number;
  ingredients: { name: string; quantity: string }[];
  steps: RecipeStep[];
  // Legacy fields kept for App.tsx compatibility, can be derived or ignored
  nodes: RecipeNode[];
  links: RecipeLink[];
}

export interface ElementDetails {
  title: string;
  description: string;
  sections: {
    heading: string;
    icon: 'TIP' | 'SUBSTITUTE' | 'SCIENCE' | 'WARNING' | 'SERVING';
    content: string;
  }[];
}

export type UnitPreference = 'METRIC' | 'IMPERIAL';

export interface UserPreferences {
  units: UnitPreference;
  servings: number;
}

export interface AnalysisInput {
  type: 'text' | 'image' | 'audio';
  content: string;
  mimeType?: string;
}

export interface HistoryItem {
  id: string;
  title: string;
  timestamp: number;
  data: RecipeGraph;
}

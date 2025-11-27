
import { GoogleGenAI, Type, SchemaShared } from "@google/genai";
import { RecipeGraph, NodeType, AnalysisInput, UserPreferences, ElementDetails, RecipeNode, RecipeLink } from "../types";

const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error("API Key is missing.");
}
const ai = new GoogleGenAI({ apiKey });

export const parseRecipeWithGemini = async (input: AnalysisInput, preferences: UserPreferences): Promise<RecipeGraph> => {
  let parts: any[] = [];

  if (input.type === 'text') {
    parts.push({ text: `Analyze this recipe: "${input.content}".` });
  } else if (input.type === 'image' || input.type === 'audio') {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || (input.type === 'image' ? 'image/jpeg' : 'audio/mp3'),
        data: input.content
      }
    });
    parts.push({ text: "Extract the recipe from this media." });
  }

  const systemInstruction = `
    You are an expert Chef and Data Normalizer.
    The user will provide an input. It might be a simple dish name (e.g., "Carbonara") or a full, messy recipe text.

    YOUR TASKS:
    1. IDENTIFY: Is the input a Dish Name or a Full Recipe?
       - If Dish Name: Retrieve a standard, high-quality recipe for this dish from your internal knowledge. Include specific quantities and ratios (${preferences.units}).
       - If Full Recipe: Use the user's text. If quantities or specific steps are missing, logically fill them in to ensure the recipe is cookable.

    2. STANDARDIZE: 
       - Break the recipe down into a LINEAR TIMELINE.
       - Ensure every step is an ATOMIC ACTION (e.g., do not say "Chop onions and garlic together" -> separate them into "Chop onions" then "Chop garlic").
       - Ensure every action has clear INPUT ingredients and OUTPUT results.
    
    OUTPUT SCHEMA EXPLANATION:
    - Return a JSON object matching the schema.
    - 'ingredients': List of all raw base ingredients with quantities.
    - 'steps': Ordered list of actions.
      - 'action': The verb (e.g. "Boil", "Chop", "Mix").
      - 'inputs': List of ingredients or previous stage outputs used in this step.
      - 'outputs': List of what is produced (e.g. "Boiled Pasta", "Chopped Onion", "Egg Shells" for waste).
  `;

  const schema: SchemaShared = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      ingredients: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING }
          }
        }
      },
      steps: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            stepIndex: { type: Type.INTEGER },
            action: { type: Type.STRING },
            inputs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING }
                }
              }
            },
            outputs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING, enum: [NodeType.STAGE, NodeType.FINAL, NodeType.WASTE] }
                }
              }
            }
          },
          required: ["stepIndex", "action", "inputs", "outputs"]
        }
      }
    },
    required: ["title", "description", "ingredients", "steps"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  try {
    const rawData = JSON.parse(response.text!);
    
    // Map to RecipeGraph interface
    const graph: RecipeGraph = {
      title: rawData.title,
      description: rawData.description,
      servings: preferences.servings,
      ingredients: rawData.ingredients,
      steps: rawData.steps,
      nodes: [], // Legacy compat
      links: []  // Legacy compat
    };
    
    return graph;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to process recipe structure.");
  }
};

export const enrichElementWithGemini = async (
  element: any, 
  context: { recipeTitle: string }
): Promise<ElementDetails> => {
  
  // Basic fallback for now since types changed slightly
  const name = element.label || element.action || element.name || "Unknown";

  const systemInstruction = `
    You are a chef instructor. Provide insights for: ${name} in the context of ${context.recipeTitle}.
  `;

  const schema: SchemaShared = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      description: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            icon: { type: Type.STRING, enum: ['TIP', 'SUBSTITUTE', 'SCIENCE', 'WARNING', 'SERVING'] },
            content: { type: Type.STRING },
          },
          required: ["heading", "icon", "content"]
        }
      }
    },
    required: ["title", "description", "sections"]
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Explain ${name}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text!) as ElementDetails;
}

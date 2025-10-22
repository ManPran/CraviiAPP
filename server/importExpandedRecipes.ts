import { db } from "./db";
import { recipeCombinations } from "@shared/schema";
import fs from "fs";
import path from "path";

interface RecipeCombinationRow {
  mealType: string;
  mainIngredient: string;
  supportingIngredients: string;
  tasteProfile: string;
  cookTime: number;
  appliance: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseRecipeCombination(line: string): RecipeCombinationRow | null {
  try {
    const columns = parseCSVLine(line);
    
    if (columns.length < 6) {
      console.log(`Skipping invalid line with ${columns.length} columns:`, line);
      return null;
    }

    const [mealType, mainIngredient, supportingIngredients, tasteProfile, cookTimeStr, appliance] = columns;
    
    const cookTime = parseInt(cookTimeStr);
    if (isNaN(cookTime)) {
      console.log(`Invalid cook time: ${cookTimeStr}`);
      return null;
    }

    return {
      mealType: mealType.trim(),
      mainIngredient: mainIngredient.trim(),
      supportingIngredients: supportingIngredients.replace(/"/g, '').trim(),
      tasteProfile: tasteProfile.trim(),
      cookTime,
      appliance: appliance.trim()
    };
  } catch (error) {
    console.error('Error parsing line:', line, error);
    return null;
  }
}

async function importExpandedRecipeCombinations() {
  try {
    console.log('Starting expanded recipe import...');
    
    // Clear existing data
    await db.delete(recipeCombinations);
    console.log('Cleared existing recipe combinations');

    // Read the expanded CSV file
    const csvPath = path.join(process.cwd(), 'attached_assets', 'Expanded_Cravii_Ingredient___Recipe_Database_1751739470964.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`Found ${lines.length} lines in CSV`);
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const recipeCombinationsToInsert: RecipeCombinationRow[] = [];
    
    for (const line of dataLines) {
      const parsed = parseRecipeCombination(line);
      if (parsed) {
        recipeCombinationsToInsert.push(parsed);
      }
    }
    
    console.log(`Parsed ${recipeCombinationsToInsert.length} valid recipe combinations`);
    
    // Insert in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < recipeCombinationsToInsert.length; i += batchSize) {
      const batch = recipeCombinationsToInsert.slice(i, i + batchSize);
      await db.insert(recipeCombinations).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recipeCombinationsToInsert.length / batchSize)}`);
    }
    
    console.log(`Successfully imported ${recipeCombinationsToInsert.length} expanded recipe combinations`);
    
    // Verify the import
    const count = await db.select().from(recipeCombinations);
    console.log(`Database now contains ${count.length} recipe combinations`);
    
  } catch (error) {
    console.error('Error importing expanded recipe combinations:', error);
    throw error;
  }
}

// Export for use in other files
export { importExpandedRecipeCombinations };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importExpandedRecipeCombinations()
    .then(() => {
      console.log('Expanded recipe import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Expanded recipe import failed:', error);
      process.exit(1);
    });
}
import { db } from "./db";
import { recipeCombinations } from "@shared/schema";
import fs from "fs";

interface FullRecipeCombinationRow {
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

function parseSupportingIngredients(supportingIngredientsString: string): string[] {
  // Remove quotes from the string if present
  let cleanString = supportingIngredientsString.trim();
  if (cleanString.startsWith('"') && cleanString.endsWith('"')) {
    cleanString = cleanString.slice(1, -1);
  }
  
  // Split by comma and clean each ingredient
  return cleanString
    .split(',')
    .map(ingredient => ingredient.trim())
    .filter(ingredient => ingredient.length > 0);
}

function parseFullRecipeCombination(line: string): FullRecipeCombinationRow | null {
  try {
    const [mealType, mainIngredient, supportingIngredients, tasteProfile, cookTime, appliance] = parseCSVLine(line);
    
    if (!mealType || !mainIngredient || !supportingIngredients || !tasteProfile || !cookTime || !appliance) {
      return null;
    }

    return {
      mealType: mealType.trim(),
      mainIngredient: mainIngredient.trim(),
      supportingIngredients: supportingIngredients.trim(),
      tasteProfile: tasteProfile.trim(),
      cookTime: parseInt(cookTime.trim()),
      appliance: appliance.trim()
    };
  } catch (error) {
    console.error('Error parsing recipe combination line:', error);
    return null;
  }
}

async function importFullRecipeCombinations() {
  try {
    console.log('Starting import of full recipe combinations...');
    
    // Clear existing recipe combinations
    await db.delete(recipeCombinations);
    console.log('Cleared existing recipe combinations');
    
    // Read the CSV file
    const csvContent = fs.readFileSync('../attached_assets/Full_Cravii_Ingredient___Recipe_Database_1751923253573.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    console.log(`Found ${lines.length} lines in CSV file`);
    
    // Skip header row
    const dataLines = lines.slice(1);
    
    const validCombinations: FullRecipeCombinationRow[] = [];
    
    for (const line of dataLines) {
      const combination = parseFullRecipeCombination(line);
      if (combination) {
        validCombinations.push(combination);
      }
    }
    
    console.log(`Parsed ${validCombinations.length} valid recipe combinations`);
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < validCombinations.length; i += batchSize) {
      const batch = validCombinations.slice(i, i + batchSize);
      
      const insertData = batch.map(combination => ({
        mealType: combination.mealType,
        mainIngredient: combination.mainIngredient,
        supportingIngredients: parseSupportingIngredients(combination.supportingIngredients),
        tasteProfile: combination.tasteProfile,
        cookTime: combination.cookTime,
        appliance: combination.appliance
      }));
      
      await db.insert(recipeCombinations).values(insertData);
      insertedCount += batch.length;
      
      if (insertedCount % 500 === 0) {
        console.log(`Inserted ${insertedCount} recipe combinations...`);
      }
    }
    
    console.log(`Successfully imported ${insertedCount} full recipe combinations!`);
    
    // Verify the import
    const count = await db.select().from(recipeCombinations);
    console.log(`Database now contains ${count.length} recipe combinations`);
    
    // Show some sample data
    const samples = count.slice(0, 3);
    console.log('Sample recipe combinations:');
    samples.forEach((sample, index) => {
      console.log(`${index + 1}. ${sample.mealType} - ${sample.mainIngredient}`);
      console.log(`   Supporting ingredients: ${sample.supportingIngredients.slice(0, 5).join(', ')}...`);
      console.log(`   Taste: ${sample.tasteProfile}, Cook time: ${sample.cookTime}min, Appliance: ${sample.appliance}`);
    });
    
  } catch (error) {
    console.error('Error importing full recipe combinations:', error);
    throw error;
  }
}

// Run the import
importFullRecipeCombinations()
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });

export { importFullRecipeCombinations };
import { readFileSync } from 'fs';
import { db } from './db';
import { recipeCombinations } from '@shared/schema';

async function importRecipeCombinations() {
  console.log('Starting import of recipe combinations...');
  
  try {
    // Read the CSV file
    const csvContent = readFileSync('attached_assets/Cravii_Ingredient___Recipe_Database_1751736160445.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header line
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    
    console.log(`Processing ${dataLines.length} combinations...`);
    
    const combinations = dataLines.map((line, index) => {
      // Better CSV parsing to handle quoted fields
      const csvFields = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          csvFields.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      csvFields.push(currentField.trim()); // Add the last field
      
      const [mealType, mainIngredient, supportingIngredients, tasteProfile, cookTime, appliance] = csvFields;
      
      const cookTimeNum = parseInt(cookTime);
      if (isNaN(cookTimeNum)) {
        console.warn(`Warning: Invalid cook time "${cookTime}" at line ${index + 2}, skipping...`);
        return null;
      }
      
      return {
        mealType: mealType,
        mainIngredient: mainIngredient,
        supportingIngredients: supportingIngredients.replace(/"/g, ''), // Remove any remaining quotes
        tasteProfile: tasteProfile,
        cookTime: cookTimeNum,
        appliance: appliance
      };
    }).filter(Boolean); // Remove null entries
    
    // Clear existing data
    await db.delete(recipeCombinations);
    console.log('Cleared existing recipe combinations');
    
    // Insert new data in batches
    const batchSize = 100;
    for (let i = 0; i < combinations.length; i += batchSize) {
      const batch = combinations.slice(i, i + batchSize);
      await db.insert(recipeCombinations).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(combinations.length / batchSize)}`);
    }
    
    console.log(`Successfully imported ${combinations.length} recipe combinations`);
    
    // Verify import
    const count = await db.select().from(recipeCombinations);
    console.log(`Verification: ${count.length} combinations in database`);
    
  } catch (error) {
    console.error('Error importing recipe combinations:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importRecipeCombinations()
    .then(() => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importRecipeCombinations };
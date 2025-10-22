import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { ingredients } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Load dietary tags from CSV and update ingredients in database
export async function loadDietaryTagsFromCSV() {
  const csvPath = path.join(process.cwd(), 'attached_assets', 'Cravii_Ingredient_Dietary_Tags_1751926046077.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    
    let updated = 0;
    let notFound = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const [ingredientName, dietaryTagsString] = line.split(',', 2);
      if (!ingredientName || !dietaryTagsString) continue;
      
      const cleanName = ingredientName.trim().replace(/"/g, '');
      const dietaryTags = dietaryTagsString.split(',').map(tag => tag.trim().replace(/"/g, ''));
      
      // Try to find and update the ingredient in database
      try {
        const [existingIngredient] = await db
          .select()
          .from(ingredients)
          .where(eq(ingredients.name, cleanName))
          .limit(1);
        
        if (existingIngredient) {
          await db
            .update(ingredients)
            .set({ dietaryTags })
            .where(eq(ingredients.id, existingIngredient.id));
          
          updated++;
          console.log(`Updated dietary tags for: ${cleanName}`);
        } else {
          notFound++;
          console.log(`Ingredient not found in database: ${cleanName}`);
        }
      } catch (error) {
        console.error(`Error updating ${cleanName}:`, error);
      }
    }
    
    console.log(`Dietary tags update complete: ${updated} updated, ${notFound} not found`);
    return { updated, notFound };
    
  } catch (error) {
    console.error('Error loading dietary tags from CSV:', error);
    throw error;
  }
}

// Run this function to update dietary tags
if (import.meta.url === `file://${process.argv[1]}`) {
  loadDietaryTagsFromCSV()
    .then(result => {
      console.log('Dietary tags loaded successfully:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to load dietary tags:', error);
      process.exit(1);
    });
}
import axios from 'axios';
import * as cheerio from 'cheerio';

async function testInstructionScraper() {
  try {
    const url = 'https://www.allrecipes.com/recipe/235056/sweet-banana-almond-oatmeal/';
    console.log(`Testing instruction scraper on: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('Page title:', $('title').text());
    
    // Test different instruction selectors
    const instructionSelectors = [
      '[itemProp="recipeInstructions"]',
      '.recipe-instructions__list-item',
      '.instructions-section li',
      '.recipe-instruction',
      '.instruction',
      '.directions-item',
      '.recipe-instructions li',
      '.instructions li',
      '.directions li'
    ];
    
    console.log('Testing instruction selectors:');
    for (const selector of instructionSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`${selector}: Found ${elements.length} elements`);
        elements.each((i, el) => {
          if (i < 3) {
            const text = $(el).text().trim();
            console.log(`  - ${text.substring(0, 100)}...`);
          }
        });
      }
    }
    
    // Look for any text that might be instructions
    console.log('\nLooking for instruction-like text patterns:');
    const bodyText = $('body').text();
    const lines = bodyText.split('\n');
    
    let found = 0;
    for (const line of lines) {
      const cleanLine = line.trim();
      if (/^\d+\.\s/.test(cleanLine) && cleanLine.length > 20 && found < 5) {
        console.log(`Found numbered instruction: ${cleanLine.substring(0, 80)}...`);
        found++;
      }
    }
    
    // Look for directions/instructions sections
    console.log('\nSearching for direction/instruction headers:');
    const directionsRegex = /directions|instructions|method|preparation|steps/i;
    for (let i = 0; i < lines.length && i < 500; i++) {
      const line = lines[i].trim();
      if (directionsRegex.test(line) && line.length < 50) {
        console.log(`Found section header: "${line}"`);
        // Show next few lines
        for (let j = 1; j <= 3 && i + j < lines.length; j++) {
          const nextLine = lines[i + j].trim();
          if (nextLine.length > 10) {
            console.log(`  Next line ${j}: ${nextLine.substring(0, 80)}...`);
          }
        }
      }
    }
    
  } catch (error: any) {
    console.error('Test instruction scraper error:', error.message);
  }
}

testInstructionScraper();
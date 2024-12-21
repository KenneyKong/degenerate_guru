import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

interface PlayerStats {
  name: string;
  team: string;
  position: string;
  age: number;
  gamesPlayed: number;
  gamesStarted: number;
  minutesPerGame: number;
  fieldGoalPercentage: number;
  threePtPercentage: number;
  freeThrowPercentage: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  pointsPerGame: number;
  threePointAttempts: number;  // 3PA (Three Point Attempts per game)
}

async function scrapeBasketballReference(playerName?: string): Promise<PlayerStats[]> {
  console.log(`Starting Basketball Reference scrape${playerName ? ` for player: ${playerName}` : ''}`);
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Add console logging from the page
    page.on('console', msg => console.log('Page console:', msg.text()));
    page.on('pageerror', err => console.error('Page error:', err));

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating to Basketball Reference...');
    await page.goto('https://www.basketball-reference.com/leagues/NBA_2025_per_game.html', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    console.log('Waiting for stats table...');
    await page.waitForSelector('table#per_game_stats', { timeout: 30000 });

    // Add a small delay to ensure dynamic content loads
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Scraping player stats...');
    const players = await page.evaluate(() => {
      const rows = document.querySelectorAll('table#per_game_stats tbody tr:not(.thead)');
      console.log(`Found ${rows.length} player rows`);
      
      return Array.from(rows).map((row) => {
        const tableRow = row as HTMLTableRowElement;
        
        // Helper function to get cell text content
        const getCellValue = (index: number): string => {
          try {
            const cell = tableRow.cells[index];
            const text = cell?.textContent?.trim() || '';
            console.log(`Column ${index}: ${text}`); // Debug logging
            return text;
          } catch (error) {
            console.error(`Error getting cell ${index}:`, error);
            return '';
          }
        };

        // Helper function to parse numbers
        const getNumericValue = (index: number): number => {
          const text = getCellValue(index);
          const value = parseFloat(text);
          console.log(`Parsing column ${index}: ${text} -> ${value}`); // Debug logging
          return isNaN(value) ? 0 : value;
        };

        // Get all values first for debugging
        const rowData = {
          name: getCellValue(1),          // Player
          team: getCellValue(3),          // Team
          position: getCellValue(4),      // Pos
          age: getNumericValue(2),        // Age
          gamesPlayed: getNumericValue(5),    // G
          gamesStarted: getNumericValue(6),   // GS
          minutesPerGame: getNumericValue(7),  // MP
          fieldGoals: getNumericValue(8),      // FG
          fieldGoalAttempts: getNumericValue(9), // FGA
          fieldGoalPercentage: getNumericValue(10), // FG%
          threePointers: getNumericValue(11),    // 3P
          threePointAttempts: getNumericValue(12), // 3PA
          threePtPercentage: getNumericValue(13),  // 3P%
          twoPointers: getNumericValue(14),     // 2P
          twoPointAttempts: getNumericValue(15), // 2PA
          twoPointPercentage: getNumericValue(16), // 2P%
          effectiveFieldGoalPercentage: getNumericValue(17), // eFG%
          freeThrows: getNumericValue(18),      // FT
          freeThrowAttempts: getNumericValue(19), // FTA
          freeThrowPercentage: getNumericValue(20), // FT%
          offensiveRebounds: getNumericValue(21),  // ORB
          defensiveRebounds: getNumericValue(22),  // DRB
          reboundsPerGame: getNumericValue(23),    // TRB (Total Rebounds)
          assistsPerGame: getNumericValue(24),     // AST
          stealsPerGame: getNumericValue(25),      // STL
          blocksPerGame: getNumericValue(26),      // BLK
          turnovers: getNumericValue(27),          // TOV
          personalFouls: getNumericValue(28),      // PF
          pointsPerGame: getNumericValue(29)       // PTS
        };

        // Log the full row data for debugging
        console.log('Row data:', rowData);
        return rowData;
      });
    });

    // Add more detailed error logging
    if (players.length === 0) {
      console.error('No players found in table');
      throw new Error('No players found');
    }

    if (playerName) {
      console.log(`Looking for player: ${playerName}`);
      const filteredPlayers = players.filter(p => {
        const match = p.name.toLowerCase().includes(playerName.toLowerCase());
        console.log(`Checking ${p.name}: ${match}`);
        return match;
      });

      console.log(`Found ${filteredPlayers.length} matches:`, 
        filteredPlayers.map(p => ({
          name: p.name,
          team: p.team,
          points: p.pointsPerGame
        }))
      );

      return filteredPlayers;
    }

    return players;
  } catch (error: unknown) {
    console.error('Detailed scraping error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
      throw error;
    } else {
      throw new Error(typeof error === 'string' ? error : 'An unknown error occurred');
    }
  } finally {
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const { player } = req.query;

  try {
    const stats = await scrapeBasketballReference(player as string | undefined);
    res.status(200).json({
      player: player || undefined,
      statsCount: stats.length,
      stats
    });
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
} 
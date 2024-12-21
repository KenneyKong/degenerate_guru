import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

interface PlayerStats {
  name: string;
  team: string;
  position?: string;
  stats: {
    [key: string]: string | number;  // Flexible stats structure for different sports
  };
}

interface GameData {
  sport: string;
  teams: string[];
  time?: string;
  score?: string;
}

type SportType = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab';

// Initialize Puppeteer with specific configuration for server environment
const initPuppeteer = async () => {
  try {
    console.log('Initializing Puppeteer...');
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  } catch (error) {
    console.error('Error initializing Puppeteer:', error);
    throw new Error(`Failed to initialize Puppeteer: ${error}`);
  }
};

// Helper function to normalize team names for comparison
const normalizeTeamName = (name: string): string => {
  const teamMappings: { [key: string]: string } = {
    // NFL
    'Arizona': 'Cardinals', 'Cardinals': 'Cardinals',
    'Atlanta': 'Falcons', 'Falcons': 'Falcons',
    'Baltimore': 'Ravens', 'Ravens': 'Ravens',
    'Buffalo': 'Bills', 'Bills': 'Bills',
    'Carolina': 'Panthers', 'Panthers': 'Panthers',
    'Chicago': 'Bears', 'Bears': 'Bears',
    'Cincinnati': 'Bengals', 'Bengals': 'Bengals',
    'Cleveland': 'Browns', 'Browns': 'Browns',
    'Dallas': 'Cowboys', 'Cowboys': 'Cowboys',
    'Denver': 'Broncos', 'Broncos': 'Broncos',
    'Detroit': 'Lions', 'Lions': 'Lions',
    'Green Bay': 'Packers', 'Packers': 'Packers',
    'Houston': 'Texans', 'Texans': 'Texans',
    'Indianapolis': 'Colts', 'Colts': 'Colts',
    'Jacksonville': 'Jaguars', 'Jaguars': 'Jaguars',
    'Kansas City': 'Chiefs', 'Chiefs': 'Chiefs',
    'Las Vegas': 'Raiders', 'Raiders': 'Raiders',
    'Los Angeles Chargers': 'Chargers', 'Chargers': 'Chargers',
    'Los Angeles Rams': 'Rams', 'Rams': 'Rams',
    'Miami': 'Dolphins', 'Dolphins': 'Dolphins',
    'Minnesota': 'Vikings', 'Vikings': 'Vikings',
    'New England': 'Patriots', 'Patriots': 'Patriots',
    'New Orleans': 'Saints', 'Saints': 'Saints',
    'New York Giants': 'Giants', 'Giants': 'Giants',
    'New York Jets': 'Jets', 'Jets': 'Jets',
    'Philadelphia': 'Eagles', 'Eagles': 'Eagles',
    'Pittsburgh': 'Steelers', 'Steelers': 'Steelers',
    'San Francisco': '49ers', '49ers': '49ers',
    'Seattle': 'Seahawks', 'Seahawks': 'Seahawks',
    'Tampa Bay': 'Buccaneers', 'Buccaneers': 'Buccaneers',
    'Tennessee': 'Titans', 'Titans': 'Titans',
    'Washington': 'Commanders', 'Commanders': 'Commanders'
  };

  // Remove common suffixes and normalize spaces
  let normalized = name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  // Try to match the full name first
  for (const [key, value] of Object.entries(teamMappings)) {
    if (normalized === key.toLowerCase()) {
      return value.toLowerCase();
    }
  }

  // If no match found, return the original normalized name
  return normalized;
};

// Helper function to check if two games are the same
const isSameGame = (game1: GameData, game2: GameData): boolean => {
  const team1Set = new Set(game1.teams.map(normalizeTeamName));
  const team2Set = new Set(game2.teams.map(normalizeTeamName));
  
  // Check if the sets have the same teams
  for (const team of team1Set) {
    if (!team2Set.has(team)) return false;
  }
  for (const team of team2Set) {
    if (!team1Set.has(team)) return false;
  }
  
  return true;
};

async function scrapeESPN(sport: SportType): Promise<GameData[]> {
  console.log('Starting scrape for sport:', sport);
  let browser;
  
  try {
    browser = await initPuppeteer();
    console.log('Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const urls: Record<SportType, { scoreboard: string, schedule: string }> = {
      nfl: {
        scoreboard: 'https://www.espn.com/nfl/scoreboard',
        schedule: 'https://www.espn.com/nfl/schedule'
      },
      nba: {
        scoreboard: 'https://www.espn.com/nba/scoreboard',
        schedule: 'https://www.espn.com/nba/schedule'
      },
      mlb: {
        scoreboard: 'https://www.espn.com/mlb/scoreboard',
        schedule: 'https://www.espn.com/mlb/schedule'
      },
      nhl: {
        scoreboard: 'https://www.espn.com/nhl/scoreboard',
        schedule: 'https://www.espn.com/nhl/schedule'
      },
      ncaaf: {
        scoreboard: 'https://www.espn.com/college-football/scoreboard',
        schedule: 'https://www.espn.com/college-football/schedule'
      },
      ncaab: {
        scoreboard: 'https://www.espn.com/mens-college-basketball/scoreboard',
        schedule: 'https://www.espn.com/mens-college-basketball/schedule'
      }
    };

    const allGames: GameData[] = [];
    const uniqueGameKeys = new Set<string>();

    // Helper function to add game if it's unique
    const addUniqueGame = (game: GameData) => {
      // Normalize and sort team names for consistent key generation
      const normalizedTeams = game.teams.map(team => normalizeTeamName(team)).sort();
      const gameKey = normalizedTeams.join('_vs_');

      if (!uniqueGameKeys.has(gameKey)) {
        uniqueGameKeys.add(gameKey);
        allGames.push(game);
      }
    };

    // Check scoreboard first
    console.log('Checking scoreboard:', urls[sport].scoreboard);
    try {
      await page.goto(urls[sport].scoreboard, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      await page.waitForSelector('section.Scoreboard, div.Scoreboard', { 
        timeout: 10000 
      }).catch(() => console.log('No scoreboard elements found immediately'));
      
      const todayGames = await page.evaluate((currentSport) => {
        const getTextContent = (element: Element | null): string => {
          return element?.textContent?.trim() || '';
        };

        const gameContainers = Array.from(document.querySelectorAll('section.Scoreboard, div.Scoreboard, div[class*="Game"]'));
        
        return gameContainers.map(container => {
          const teamElements = container.querySelectorAll('div.ScoreCell__TeamName, td.team div.inner-wrapper span, span.sb-team-short, div.TeamName, div[class*="teamName"], div[class*="TeamName"]');
          const teams = Array.from(teamElements)
            .map(team => getTextContent(team))
            .filter(team => team.length > 0);

          const timeElement = container.querySelector('div.ScoreboardScoreCell__Time, span.time-stamp, div.game-status, div.GameInfo, div[class*="gameStatus"]');
          const time = getTextContent(timeElement);

          if (teams.length >= 2) {
            return {
              sport: currentSport,
              teams: [teams[0], teams[1]],
              time,
            };
          }
          return null;
        }).filter(game => game !== null);
      }, sport);

      todayGames.forEach(game => game && addUniqueGame(game));
    } catch (error) {
      console.error('Error scraping scoreboard:', error);
      // Continue to schedule page even if scoreboard fails
    }

    // Always check schedule page as well
    console.log('Checking schedule:', urls[sport].schedule);
    try {
      await page.goto(urls[sport].schedule, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      
      await page.waitForSelector('tr.Table__TR', { 
        timeout: 10000 
      }).catch(() => console.log('No schedule elements found immediately'));

      const scheduleGames = await page.evaluate((currentSport) => {
        const getTextContent = (element: Element | null): string => {
          return element?.textContent?.trim() || '';
        };

        const gameRows = Array.from(document.querySelectorAll('tr.Table__TR, tr[class*="GameRow"]'));
        
        return gameRows.map(row => {
          const teamElements = row.querySelectorAll('td.Table__TD a.AnchorLink, td a.AnchorLink, a[class*="TeamLink"]');
          const teams = Array.from(teamElements)
            .map(team => getTextContent(team))
            .filter(team => team.length > 0);

          if (teams.length >= 2) {
            const dateElement = row.querySelector('td.Table__TD span, td span, span[class*="Date"]');
            const timeElement = row.querySelector('td.Table__TD--time, td.time, span[class*="Time"]');
            const date = getTextContent(dateElement);
            const time = getTextContent(timeElement);

            return {
              sport: currentSport,
              teams: [teams[0], teams[1]],
              time: time ? `${date} ${time}`.trim() : date,
            };
          }
          return null;
        }).filter(game => game !== null);
      }, sport);

      scheduleGames.forEach(game => game && addUniqueGame(game));
    } catch (error) {
      console.error('Error scraping schedule:', error);
      // If both scrapes failed and no games were found, throw error
      if (allGames.length === 0) {
        throw new Error(`Failed to scrape ${sport} games`);
      }
    }

    // Sort games by time
    allGames.sort((a, b) => {
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });

    console.log('Scraped games:', JSON.stringify(allGames, null, 2));
    return allGames;
  } catch (error) {
    console.error('Error scraping ESPN:', error);
    throw new Error(`Failed to scrape ESPN: ${error}`);
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

  const { sport } = req.query;
  
  if (!sport || typeof sport !== 'string' || !['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'].includes(sport)) {
    res.status(400).json({ 
      error: 'Invalid sport parameter',
      validSports: ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab']
    });
    return;
  }

  try {
    const games = await scrapeESPN(sport as SportType);
    res.status(200).json({
      sport,
      gamesCount: games.length,
      games
    });
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

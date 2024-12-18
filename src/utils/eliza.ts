import { ESPNScraper } from './espnScraper';

export class Eliza {
  private readonly initialMessages = [
    "Ready to make some money today? What sports are you looking at?",
    "Let's find you a winning parlay today. What games caught your eye?",
    "The odds are looking juicy today. What sport should we analyze?",
    "Time to beat the bookies! What markets are you interested in?",
    "I'm seeing some great value bets today. What sport are you betting on?",
  ];

  private readonly scraper: ESPNScraper;

  constructor() {
    this.scraper = ESPNScraper.getInstance();
  }

  private async getSportGames(sport: string): Promise<string> {
    try {
      let sportType = sport.toLowerCase();
      const sportMap: { [key: string]: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab' } = {
        'football': 'nfl',
        'nfl': 'nfl',
        'basketball': 'nba',
        'nba': 'nba',
        'baseball': 'mlb',
        'mlb': 'mlb',
        'hockey': 'nhl',
        'nhl': 'nhl',
        'college football': 'ncaaf',
        'ncaa football': 'ncaaf',
        'ncaaf': 'ncaaf',
        'college basketball': 'ncaab',
        'ncaa basketball': 'ncaab',
        'ncaab': 'ncaab'
      };

      const mappedSport = sportMap[sportType];
      if (!mappedSport) {
        return `I couldn't understand which sport you're asking about. Try using specific leagues like NFL, NBA, MLB, NHL, NCAAF, or NCAAB.`;
      }

      const games = await this.scraper.getGamesBySport(mappedSport);

      if (!games || games.length === 0) {
        return `I couldn't find any ${mappedSport.toUpperCase()} games scheduled for today. Try checking another sport!`;
      }

      return games.map(game => 
        `${game.teams.join(' vs ')}${game.time ? ` (${game.time})` : ''}${game.odds ? ` [${game.odds}]` : ''}`
      ).join('\n');
    } catch (error) {
      console.error('Error getting sport games:', error);
      throw error; // Propagate error to respond() method
    }
  }

  private async handleSportResponse(sport: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab'): Promise<string> {
    try {
      const games = await this.getSportGames(sport);
      if (!games.includes("couldn't find") && !games.includes("had trouble")) {
        const insights = {
          'nfl': "Prime time games have been trending under lately. I'm also seeing value in player props! 🎯",
          'nba': "First quarter trends are strong in these matchups. Live betting has been profitable! 💰",
          'mlb': "Weather conditions are perfect for some totals plays. Also watching those F5 lines! ⚾",
          'nhl': "Puck line value is looking prime. I've analyzed all the goalie matchups! 🏒",
          'ncaaf': "Home dogs have been crushing it. Conference games are where the value is! 🏈",
          'ncaab': "Early lines have some gaps. Sharp money is moving fast on these! 🏀"
        }[sport] || "I'm seeing some great betting opportunities in these matchups! 🎯";
        
        return `Yo degen! Here are the ${sport.toUpperCase()} games you can bet on today:\n\n${games}\n\n${insights}`;
      }
      return games;
    } catch (error) {
      console.error('Error in sport response:', error);
      return `Yo degen! I'm having trouble accessing the latest ${sport.toUpperCase()} data right now. Try again in a moment or check out another sport! 🎯`;
    }
  }

  async respond(input: string): Promise<string> {
    const lowerInput = input.toLowerCase();

    // Define sport patterns with more specific matching
    const sportMatches = {
      'nfl': /\b(nfl|national football league)\b/i,
      'nba': /\b(nba|national basketball association)\b/i,
      'mlb': /\b(mlb|major league baseball)\b/i,
      'nhl': /\b(nhl|national hockey league|hockey)\b/i,
      'ncaaf': /\b(ncaaf|college football|ncaa football)\b/i,
      'ncaab': /\b(ncaab|college basketball|ncaa basketball)\b/i
    };

    // Map generic sport names to their leagues
    const genericSportMap: { [key: string]: 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab' } = {
      'hockey': 'nhl',
      'baseball': 'mlb'
    };

    // Check for generic sport names first
    for (const [genericName, league] of Object.entries(genericSportMap)) {
      if (lowerInput.includes(genericName)) {
        return await this.handleSportResponse(league);
      }
    }

    // If input mentions football or basketball, determine if it's college or pro
    if (/\b(football)\b/i.test(lowerInput)) {
      if (/\b(college|ncaa|ncaaf)\b/i.test(lowerInput)) {
        return await this.handleSportResponse('ncaaf');
      } else if (/\b(nfl|pro|professional)\b/i.test(lowerInput)) {
        return await this.handleSportResponse('nfl');
      } else {
        // If not specified, ask for clarification
        return "Are you interested in NFL or College Football games? Let me know which one and I'll hook you up with the latest odds! 🏈";
      }
    }

    if (/\b(basketball)\b/i.test(lowerInput)) {
      if (/\b(college|ncaa|ncaab)\b/i.test(lowerInput)) {
        return await this.handleSportResponse('ncaab');
      } else if (/\b(nba|pro|professional)\b/i.test(lowerInput)) {
        return await this.handleSportResponse('nba');
      } else {
        // If not specified, ask for clarification
        return "Are you looking for NBA or College Basketball games? Let me know which one and I'll show you what's available! 🏀";
      }
    }

    // For explicit league mentions, use direct matching
    for (const [sport, pattern] of Object.entries(sportMatches)) {
      if (pattern.test(lowerInput)) {
        return await this.handleSportResponse(sport as 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab');
      }
    }

    // If asking about games generally without specifying sport
    if (lowerInput.includes('game') || 
        lowerInput.includes('play') || 
        lowerInput.includes('bet') ||
        lowerInput.includes('odds')) {
      
      try {
        const allGames = await this.scraper.getTodaysGames();

        if (!allGames || allGames.length === 0) {
          return "I couldn't find any games scheduled right now. Try asking about a specific sport like 'What NBA games are on tonight?'";
        }

        // Group games by sport
        const gamesBySport = allGames.reduce((acc: { [key: string]: string[] }, game) => {
          if (!acc[game.sport]) acc[game.sport] = [];
          acc[game.sport].push(
            `${game.teams.join(' vs ')}${game.time ? ` (${game.time})` : ''}${game.odds ? ` [${game.odds}]` : ''}`
          );
          return acc;
        }, {});

        return `Yo degen! Here's all the action we've got today! 🔥\n\n${
          Object.entries(gamesBySport)
            .map(([sport, games]) => `${sport.toUpperCase()} Games:\n${games.join('\n')}`)
            .join('\n\n')
        }\n\nWhich games are you eyeing? Let me know and I'll give you my best picks! 💰`;
      } catch (error) {
        console.error('Error getting all games:', error);
        return "Yo degen! I'm having trouble accessing the latest sports data. Try asking about a specific sport like 'What NBA games are on tonight?' 🎯";
      }
    }

    // Generic betting terms responses
    const genericPatterns = {
      "parlay|accumulator": [
        "Want a fire parlay? Let me know which sports and I'll give you my best picks! 🔥",
        "Parlays are tough but I've got a system. Keep it to 2-3 legs max for best value. 💰",
        "I'm seeing some correlated parlay opportunities today. Want my picks? 🎯",
      ],
      "over|under": [
        "Sharp money loves the unders! Let me know which game you're looking at. 🎯",
        "Totals are my specialty. I analyze pace stats, weather, everything! Want my picks? 💰",
        "Over/under betting is all about timing. I'm seeing some great spots today! 🎲",
      ],
      "spread|line": [
        "Line shopping is key for spreads. I track movement across all books. Want my insights? 🎯",
        "Sharp money is moving some lines today. Let me know which games you're eyeing! 💰",
        "I've got some key injury info that's gonna move these spreads. Want the intel? 🔥",
      ],
      "prop|props": [
        "Props are where the real money's at! Books struggle with these lines. Want my picks? 💰",
        "I've got some fire prop bets today! Let me know which sport you're betting! 🔥",
        "Player props are my bread and butter. Which sport should we attack today? 🎯",
      ]
    };

    for (const [pattern, responses] of Object.entries(genericPatterns)) {
      if (new RegExp(pattern, "i").test(lowerInput)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Fallback response
    return "Yo degen! I'm your go-to for all things sports betting! 🎯 I can hook you up with games and picks for NBA, NFL, MLB, NHL, NCAAF, or NCAAB. Just let me know which sport you want to crush today! 💰";
  }
}

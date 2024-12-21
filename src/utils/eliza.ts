import { ESPNScraper, PlayerStats, SportType } from './espnScraper';

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

    // Check for player stats queries first
    const playerPatterns = {
      'stats': /what.*(averaging|stats|statistics|scoring)/i,
      'best': /(who|which).*(best|top|leading|highest)/i,
      'specific': /(how.*is|what.*is|what.*are)\s+([a-z\s]+)\s+(averaging|scoring|doing|stats|statistics)/i
    };

    // Handle player stats queries
    if (playerPatterns.stats.test(lowerInput) || playerPatterns.best.test(lowerInput) || playerPatterns.specific.test(lowerInput)) {
      try {
        // Determine the sport context
        let sport: SportType = 'nba';  // Default to NBA if not specified
        if (lowerInput.includes('nfl') || lowerInput.includes('football')) sport = 'nfl';
        if (lowerInput.includes('mlb') || lowerInput.includes('baseball')) sport = 'mlb';
        if (lowerInput.includes('nhl') || lowerInput.includes('hockey')) sport = 'nhl';
        if (lowerInput.includes('college football') || lowerInput.includes('ncaaf')) sport = 'ncaaf';
        if (lowerInput.includes('college basketball') || lowerInput.includes('ncaab')) sport = 'ncaab';

        // Get player stats
        const stats = await this.scraper.getPlayerStats(sport);
        
        // If looking for a specific player
        const playerMatch = lowerInput.match(/(how.*is|what.*is|what.*are)\s+([a-z\s]+)\s+(averaging|scoring|doing|stats|statistics)/i);
        if (playerMatch) {
          const playerName = playerMatch[2].trim();
          console.log('Looking for player:', playerName);
          
          // Find the player by name (case-insensitive)
          const playerStats = stats.filter(player => 
            player.name.toLowerCase().includes(playerName.toLowerCase())
          );
          
          console.log('Found player stats:', playerStats);
          
          if (playerStats.length > 0) {
            const player = playerStats[0];
            let statLines = '';

            // Format stats based on sport
            switch (sport) {
              case 'nba':
                statLines = [
                  `Points: ${player.stats['pts'] || player.stats['points'] || player.stats['avg'] || '0'} PPG`,
                  `Field Goals: ${player.stats['fgm'] || player.stats['field_goals_made'] || player.stats['fgm/g'] || '0'}/${player.stats['fga'] || player.stats['field_goals_attempted'] || player.stats['fga/g'] || '0'} (${player.stats['fg%'] || player.stats['field_goal_pct'] || player.stats['fg_pct'] || '0'}%)`,
                  `3-Pointers: ${player.stats['3pm'] || player.stats['three_points_made'] || player.stats['3pm/g'] || '0'}/${player.stats['3pa'] || player.stats['three_points_attempted'] || player.stats['3pa/g'] || '0'} (${player.stats['3p%'] || player.stats['three_point_pct'] || player.stats['3pt_pct'] || '0'}%)`,
                  `Free Throws: ${player.stats['ftm'] || player.stats['free_throws_made'] || player.stats['ftm/g'] || '0'}/${player.stats['fta'] || player.stats['free_throws_attempted'] || player.stats['fta/g'] || '0'} (${player.stats['ft%'] || player.stats['free_throw_pct'] || player.stats['ft_pct'] || '0'}%)`,
                  `Minutes: ${player.stats['min'] || player.stats['minutes'] || player.stats['min/g'] || '0'} MPG`,
                  `Rebounds: ${player.stats['reb'] || player.stats['rebounds'] || player.stats['reb/g'] || '0'} RPG (${player.stats['oreb'] || player.stats['offensive_rebounds'] || player.stats['oreb/g'] || '0'} OFF, ${player.stats['dreb'] || player.stats['defensive_rebounds'] || player.stats['dreb/g'] || '0'} DEF)`,
                  `Assists: ${player.stats['ast'] || player.stats['assists'] || player.stats['ast/g'] || '0'} APG`,
                  `Steals: ${player.stats['stl'] || player.stats['steals'] || player.stats['stl/g'] || '0'} SPG`,
                  `Blocks: ${player.stats['blk'] || player.stats['blocks'] || player.stats['blk/g'] || '0'} BPG`,
                  `Turnovers: ${player.stats['to'] || player.stats['turnovers'] || player.stats['to/g'] || '0'} TPG`,
                  `Plus/Minus: ${player.stats['plus_minus'] || player.stats['+/-'] || '0'}`
                ].join('\n');
                break;

              case 'nfl':
                if (player.stats['pass_att']) { // QB stats
                  statLines = [
                    `Passing: ${player.stats['pass_yds'] || '0'} yards (${player.stats['pass_yds_per_game'] || '0'} YPG)`,
                    `Touchdowns: ${player.stats['pass_td'] || '0'} TD (${player.stats['pass_td_per_game'] || '0'} per game)`,
                    `Interceptions: ${player.stats['int'] || '0'} INT (${player.stats['int_per_game'] || '0'} per game)`,
                    `Completion: ${player.stats['comp'] || '0'}/${player.stats['pass_att'] || '0'} (${player.stats['comp_pct'] || '0'}%)`,
                    `QB Rating: ${player.stats['rating'] || '0'}`,
                    `Yards Per Attempt: ${player.stats['yards_per_attempt'] || '0'} YPA`,
                    `Rush Yards: ${player.stats['rush_yds'] || '0'} (${player.stats['rush_yds_per_game'] || '0'} YPG)`,
                    `Rush TD: ${player.stats['rush_td'] || '0'} (${player.stats['rush_td_per_game'] || '0'} per game)`
                  ].join('\n');
                } else { // Skill position stats
                  statLines = [
                    `Rushing: ${player.stats['rush_yds'] || '0'} yards (${player.stats['rush_yds_per_game'] || '0'} YPG)`,
                    `Rush TD: ${player.stats['rush_td'] || '0'} (${player.stats['rush_td_per_game'] || '0'} per game)`,
                    `Receiving: ${player.stats['rec_yds'] || '0'} yards (${player.stats['rec_yds_per_game'] || '0'} YPG)`,
                    `Receptions: ${player.stats['rec'] || '0'} (${player.stats['rec_per_game'] || '0'} per game)`,
                    `Receiving TD: ${player.stats['rec_td'] || '0'} (${player.stats['rec_td_per_game'] || '0'} per game)`,
                    `Total Touchdowns: ${player.stats['total_td'] || '0'} (${player.stats['td_per_game'] || '0'} per game)`,
                    `Yards Per Touch: ${player.stats['yds_per_touch'] || '0'}`,
                    `Targets: ${player.stats['targets'] || '0'} (${player.stats['targets_per_game'] || '0'} per game)`
                  ].join('\n');
                }
                break;

              case 'mlb':
                if (player.stats['era']) { // Pitcher stats
                  statLines = [
                    `ERA: ${player.stats['era'] || '0.00'}`,
                    `Record: ${player.stats['w'] || '0'}-${player.stats['l'] || '0'}`,
                    `Strikeouts: ${player.stats['so'] || '0'} (${player.stats['so_per_9'] || '0'} K/9)`,
                    `WHIP: ${player.stats['whip'] || '0.00'}`,
                    `Innings: ${player.stats['ip'] || '0'} (${player.stats['ip_per_start'] || '0'} per start)`,
                    `Walks: ${player.stats['bb'] || '0'} (${player.stats['bb_per_9'] || '0'} BB/9)`,
                    `Hits Allowed: ${player.stats['h'] || '0'} (${player.stats['h_per_9'] || '0'} H/9)`,
                    `Quality Starts: ${player.stats['qs'] || '0'} (${player.stats['qs_pct'] || '0'}%)`
                  ].join('\n');
                } else { // Batter stats
                  statLines = [
                    `Batting: ${player.stats['avg'] || '.000'} AVG/${player.stats['obp'] || '.000'} OBP/${player.stats['slg'] || '.000'} SLG`,
                    `Home Runs: ${player.stats['hr'] || '0'} (${player.stats['hr_per_game'] || '0'} per game)`,
                    `RBI: ${player.stats['rbi'] || '0'} (${player.stats['rbi_per_game'] || '0'} per game)`,
                    `Hits/AB: ${player.stats['h'] || '0'}/${player.stats['ab'] || '0'} (${player.stats['hits_per_game'] || '0'} per game)`,
                    `Runs: ${player.stats['r'] || '0'} (${player.stats['runs_per_game'] || '0'} per game)`,
                    `Walks: ${player.stats['bb'] || '0'} (${player.stats['bb_per_game'] || '0'} per game)`,
                    `Strikeouts: ${player.stats['so'] || '0'} (${player.stats['so_per_game'] || '0'} per game)`,
                    `Extra Base Hits: ${player.stats['xbh'] || '0'} (${player.stats['xbh_per_game'] || '0'} per game)`
                  ].join('\n');
                }
                break;

              case 'nhl':
                statLines = [
                  `Goals: ${player.stats['g'] || '0'} (${player.stats['goals_per_game'] || '0'} per game)`,
                  `Assists: ${player.stats['a'] || '0'} (${player.stats['assists_per_game'] || '0'} per game)`,
                  `Points: ${player.stats['pts'] || '0'} (${player.stats['points_per_game'] || '0'} per game)`,
                  `Plus/Minus: ${player.stats['plus_minus'] || '0'}`,
                  `Shots: ${player.stats['shots'] || '0'} (${player.stats['shots_per_game'] || '0'} per game)`,
                  `Shot %: ${player.stats['shot_pct'] || '0'}%`,
                  `Time on Ice: ${player.stats['toi_per_game'] || '0'} per game`,
                  `Power Play Points: ${player.stats['pp_points'] || '0'} (${player.stats['pp_points_per_game'] || '0'} per game)`
                ].join('\n');
                break;

              default:
                statLines = Object.entries(player.stats)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('\n');
            }

            return `Yo degen! Here are ${player.name}'s stats this season:\n\n${statLines}\n\n💥 Looking fire! Want to know about any other players? 🔥`;
          }
        }

        // If asking about best/top players
        if (playerPatterns.best.test(lowerInput)) {
          if (stats.length > 0) {
            // Sort by points/relevant stat based on sport
            const sortedStats = [...stats].sort((a, b) => {
              const getMainStat = (player: PlayerStats): number => {
                const stats = player.stats;
                switch (sport) {
                  case 'nba': 
                    return Number(stats['pts']) || Number(stats['points']) || 0;
                  case 'nfl': 
                    return Number(stats['td']) || Number(stats['touchdowns']) || 0;
                  case 'mlb': 
                    const avg = stats['avg'];
                    return typeof avg === 'number' ? avg : typeof avg === 'string' ? parseFloat(avg) || 0 : 0;
                  case 'nhl': 
                    return Number(stats['goals']) || 0;
                  default: 
                    return 0;
                }
              };
              return getMainStat(b) - getMainStat(a);
            });

            const top5 = sortedStats.slice(0, 5);
            const statLines = top5.map(player => {
              const mainStat = sport === 'nba' ? 'pts' : 
                             sport === 'nfl' ? 'td' :
                             sport === 'mlb' ? 'avg' :
                             sport === 'nhl' ? 'goals' : 'points';
              return `${player.name} (${player.team}): ${player.stats[mainStat] || 0} ${mainStat}`;
            }).join('\n');

            return `Yo degen! Here are the top performers in ${sport.toUpperCase()} this season:\n\n${statLines}\n\n🔥 These players are on fire! Want to know more about any of them? 💪`;
          }
        }

        return `I couldn't find any player stats at the moment. Try asking about specific players or check back later! 🎯`;
      } catch (error) {
        console.error('Error handling player stats query:', error);
        return `Yo degen! I'm having trouble accessing the latest player stats right now. Try again in a moment! 🎯`;
      }
    }

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

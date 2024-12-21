export interface GameData {
  sport: string;
  teams: string[];
  time?: string;
  odds?: string;
}

export interface PlayerStats {
  name: string;
  team: string;
  position?: string;
  stats: {
    [key: string]: string | number;
  };
}

export type SportType = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab';

export class ESPNScraper {
  private static instance: ESPNScraper;
  private cache: {
    data: GameData[];
    lastUpdated: number;
  } = {
    data: [],
    lastUpdated: 0
  };

  private constructor() {
    // Private constructor for singleton pattern
    return;
  }

  static getInstance(): ESPNScraper {
    if (!ESPNScraper.instance) {
      ESPNScraper.instance = new ESPNScraper();
    }
    return ESPNScraper.instance;
  }

  async getGames(sport: SportType): Promise<GameData[]> {
    // Check cache - refresh if older than 5 minutes
    const now = Date.now();
    const cachedGames = this.cache.data.filter(game => game.sport === sport);
    if (cachedGames.length > 0 && now - this.cache.lastUpdated < 300000) {
      return cachedGames;
    }

    let retries = 2;
    while (retries > 0) {
      try {
        const response = await fetch(`/api/espn?sport=${sport}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Extract games array from API response
        let games = data.games || [];

        // Filter and sort games
        games = games
          // Only keep games that have actual times (containing ":")
          .filter((game: GameData) => game.time?.includes(':'))
          // Then remove duplicates based on normalized team names
          .filter((game: GameData, index: number, self: GameData[]) => {
            // Create sets of normalized team names for comparison
            const currentTeams = new Set(
              game.teams.map(team => 
                team.toLowerCase()
                  // Remove common city prefixes for all sports
                  .replace(/^(los angeles|new york|golden state|oklahoma city|tampa bay|green bay|new england|new orleans|san francisco|san diego|san antonio|kansas city)/, '')
                  // Remove common abbreviations
                  .replace(/^(la|ny|gs|okc|tb|gb|ne|no|sf|sd|sa|kc)/, '')
                  // Remove common suffixes
                  .replace(/(united|fc|city|town)$/, '')
                  .replace(/[^a-z]/g, '') // Remove non-letters
                  .trim()
              )
            );

            // This is the first occurrence of these teams
            return index === self.findIndex((g: GameData) => {
              const otherTeams = new Set(
                g.teams.map(team => 
                  team.toLowerCase()
                    .replace(/^(los angeles|new york|golden state|oklahoma city|tampa bay|green bay|new england|new orleans|san francisco|san diego|san antonio|kansas city)/, '')
                    .replace(/^(la|ny|gs|okc|tb|gb|ne|no|sf|sd|sa|kc)/, '')
                    .replace(/(united|fc|city|town)$/, '')
                    .replace(/[^a-z]/g, '')
                    .trim()
                )
              );

              // Check if the sets have the same teams
              if (currentTeams.size !== otherTeams.size) return false;
              for (const team of currentTeams) {
                if (!otherTeams.has(team)) return false;
              }
              return true;
            });
          })
          // Sort by time in ascending order
          .sort((a: GameData, b: GameData) => {
            // Convert time strings to comparable numbers
            const convertTimeToMinutes = (timeStr: string): number => {
              const [time, period] = timeStr.split(' ');
              const [hours, minutes] = time.split(':').map(Number);
              let totalMinutes = hours * 60 + minutes;
              
              // Adjust for PM times
              if (period === 'PM' && hours !== 12) {
                totalMinutes += 12 * 60;
              }
              // Adjust for AM 12
              if (period === 'AM' && hours === 12) {
                totalMinutes -= 12 * 60;
              }
              
              return totalMinutes;
            };

            const timeA = a.time || '99:99 PM';
            const timeB = b.time || '99:99 PM';
            
            return convertTimeToMinutes(timeA) - convertTimeToMinutes(timeB);
          });
        
        // Only update cache if we got games
        if (games.length > 0) {
          // Update cache while preserving games from other sports
          this.cache.data = [
            ...this.cache.data.filter(game => game.sport !== sport),
            ...games
          ];
          this.cache.lastUpdated = now;
        }

        return games;
      } catch (error) {
        console.error(`Error fetching games (${retries} retries left):`, error);
        retries--;
        if (retries > 0) {
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        // If we have cached data, return it even if it's old
        if (cachedGames.length > 0) {
          console.log('Returning stale cached data due to fetch error');
          return cachedGames;
        }
        throw error;
      }
    }
    return [];
  }

  async getTodaysGames(): Promise<GameData[]> {
    const allGames: GameData[] = [];
    const sports: SportType[] = ['nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab'];
    const errors: Error[] = [];

    // Try to fetch each sport's games
    await Promise.all(sports.map(async sport => {
      try {
        const games = await this.getGames(sport);
        allGames.push(...games);
      } catch (error) {
        console.error(`Error fetching ${sport} games:`, error);
        errors.push(error as Error);
      }
    }));

    // If we got some games despite errors, return them
    if (allGames.length > 0) {
      return allGames;
    }
    
    // If we got no games and had errors, throw the first error
    if (errors.length > 0) {
      throw errors[0];
    }

    return allGames;
  }

  async getGamesByTeam(teamName: string): Promise<GameData[]> {
    const allGames = await this.getTodaysGames();
    return allGames.filter(game => 
      game.teams.some(team => 
        team.toLowerCase().includes(teamName.toLowerCase())
      )
    );
  }

  async getGamesBySport(sport: SportType): Promise<GameData[]> {
    return await this.getGames(sport);
  }

  async getOddsBySport(sport: SportType): Promise<string[]> {
    const games = await this.getGames(sport);
    return games.map(game => game.odds || '').filter(odds => odds !== '');
  }

  async getPlayerStats(sport: SportType): Promise<PlayerStats[]> {
    try {
      const response = await fetch(`/api/espn?sport=${sport}&type=stats`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch player stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.stats || [];
    } catch (error) {
      console.error('Error fetching player stats:', error);
      throw error;
    }
  }

  async getPlayerStatsBySport(sport: SportType): Promise<PlayerStats[]> {
    return await this.getPlayerStats(sport);
  }

  async getPlayerStatsByTeam(sport: SportType, teamName: string): Promise<PlayerStats[]> {
    const stats = await this.getPlayerStats(sport);
    return stats.filter(player => 
      player.team.toLowerCase().includes(teamName.toLowerCase())
    );
  }

  async getPlayerStatsByName(sport: SportType, playerName: string): Promise<PlayerStats[]> {
    const stats = await this.getPlayerStats(sport);
    return stats.filter(player => 
      player.name.toLowerCase().includes(playerName.toLowerCase())
    );
  }
}

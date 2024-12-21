import React, { FC, useEffect, useState, useRef } from 'react';
import { Eliza } from '../utils/eliza';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const fetchPlayerStats = async (playerName: string) => {
  try {
    const response = await fetch(`/api/basketball-reference?player=${encodeURIComponent(playerName)}`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    const data = await response.json();
    return data.stats[0]; // Return first matching player
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }
};

const Chat: FC = () => {
  const [query, setQuery] = useState<string>('');
  const [messageList, setMessageList] = useState<Message[]>([
    {
      role: 'assistant',
      content: "What's up degens! Ready to make some money? Tell me what sports you're looking at today and I'll give you my best picks! 🎯"
    }
  ]);
  const [waiting, setWaiting] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const eliza = useRef(new Eliza());

  useEffect(() => {
    scrollToBottom();
  }, [messageList]);

  const scrollToBottom = () => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const createMessage = async (content: string) => {
    try {
      const userMessage: Message = {
        role: 'user',
        content: content
      };
      setMessageList(prev => [...prev, userMessage]);
      setQuery("");
      setWaiting(true);

      // Improved pattern matching for stats questions
      const statsPatterns = [
        /how many points is (.*?) averaging/i,
        /what is (.*?) averaging/i,
        /what are (.*?)(?:'s)? stats/i,
        /what(?:'s| is) (.*?)(?:'s)? stats/i,
        /what is (.*?) avg/i,
        /(.*?) stats/i,
        /stats for (.*)/i,
        /how many (?:3|three) pointers? does (.*?) attempt/i,
        /how many (?:3|three) point attempts? does (.*?) average/i,
        /(.*?) (?:3|three) point attempts/i
      ];

      // Check if it's a stats question
      let playerName = '';
      for (const pattern of statsPatterns) {
        const match = content.match(pattern);
        if (match) {
          playerName = match[1] || match[2];
          break;
        }
      }

      if (playerName) {
        console.log('Fetching stats for player:', playerName);
        const stats = await fetchPlayerStats(playerName);
        
        if (stats) {
          if (content.toLowerCase().includes('3') || content.toLowerCase().includes('three')) {
            const response = `${stats.name} (${stats.team}) attempts ${stats.threePointAttempts.toFixed(1)} three-pointers per game this season.`;
            
            const assistantMessage: Message = {
              role: 'assistant',
              content: response
            };
            setMessageList(prev => [...prev, assistantMessage]);
            setWaiting(false);
            return;
          }
          const response = `${stats.name} (${stats.team}) is averaging ${stats.pointsPerGame.toFixed(1)} PPG, ${stats.reboundsPerGame.toFixed(1)} RPG, and ${stats.assistsPerGame.toFixed(1)} APG this season. He's shooting ${(stats.fieldGoalPercentage * 100).toFixed(1)}% from the field and ${(stats.threePtPercentage * 100).toFixed(1)}% from three.`;
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: response
          };
          setMessageList(prev => [...prev, assistantMessage]);
          setWaiting(false);
          return;
        } else {
          const notFoundMessage: Message = {
            role: 'assistant',
            content: `Sorry, I couldn't find stats for ${playerName}. Please check the spelling or try another player.`
          };
          setMessageList(prev => [...prev, notFoundMessage]);
          setWaiting(false);
          return;
        }
      }

      // If not a stats request or no stats found, continue with regular response
      const guruResponse = await eliza.current.respond(content);
      const assistantMessage: Message = {
        role: 'assistant',
        content: guruResponse
      };

      setMessageList(prev => [...prev, assistantMessage]);
      setWaiting(false);
    } catch (error) {
      console.error("Error in conversation:", error);
      setWaiting(false);
      const errorMessage: Message = {
        role: 'assistant',
        content: "Sorry, I'm having trouble accessing the latest sports data. Let me give you some general advice instead."
      };
      setMessageList(prev => [...prev, errorMessage]);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      createMessage(query);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col h-80 overflow-y-auto mb-4 p-4">
        {messageList.map((message, index) => (
          <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
            <div 
              className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                message.role === "user" ? "bg-cyan-700" : "bg-slate-800"
              }`}
            >
              <p className={`text-sm whitespace-pre-line ${
                message.role === "user" ? "text-white" : "text-white"
              }`}>
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {waiting && (
          <div className="flex justify-start items-center mt-2">
            <div className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-md">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="none"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 4.418 3.582 8 8 8v-4c-1.88 0-3.617-.646-5-1.709z"
                />
              </svg>
              <span>Analyzing odds & games...</span>
            </div>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col text-center w-full max-w-4xl">
        <div className="mt-4 flex flex-row items-center">
          <input
            style={{ flex: 1 }}
            onChange={handleQueryChange}
            value={query}
            id="query"
            placeholder="Ask about today's best bets..."
            className="p-1.5 border max-w-[680px] rounded-md focus:outline-none focus:border-gray-400 bg-slate-600 text-white"
          />
          <button 
            type="submit" 
            disabled={waiting}
            className={`px-4 py-2 ml-2 text-white rounded-md focus:outline-none ${
              waiting ? 'bg-gray-500' : 'bg-green-700 hover:bg-green-600'
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;

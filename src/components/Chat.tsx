import React, { FC, useEffect, useState, useRef } from 'react';
import { Eliza } from '../utils/eliza';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: content
      };
      setMessageList(prev => [...prev, userMessage]);
      setQuery("");
      setWaiting(true);

      // Simulate a small delay for analyzing odds
      await new Promise(resolve => setTimeout(resolve, 800));

      // Get Guru's response - now using async respond method
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
      // Add error message to chat
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

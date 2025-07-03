import React, { useContext } from 'react';
import VoiceAssistant from './VoiceAssistant.jsx';
import Footer from './Footer.jsx';
import { ThemeContext } from '../main.jsx';
import { Sun, Moon } from 'lucide-react';

const App = () => {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 transition-colors duration-500">
      <div className="w-full max-w-5xl flex flex-col gap-4">
        <header className="flex justify-between items-center mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">AI Voice Secretary</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a href="https://github.com/abdullah-khaled0" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">GitHub</a>
            <a href="https://abdullah-khaled0.github.io/portfolio-react/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">Portfolio</a>
          </div>
        </header>
        <main className="flex flex-1 w-full">
          <VoiceAssistant />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default App;
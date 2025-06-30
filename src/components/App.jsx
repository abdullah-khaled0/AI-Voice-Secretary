import React from 'react';
import VoiceAssistant from './VoiceAssistant.jsx';
import Footer from './Footer.jsx';

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <VoiceAssistant />
      <Footer />
    </div>
  );
};

export default App;
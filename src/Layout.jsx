import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        :root {
          --background: 0 0% 0%;
          --foreground: 0 0% 100%;
          --card: 0 0% 7%;
          --card-foreground: 0 0% 100%;
          --popover: 0 0% 7%;
          --popover-foreground: 0 0% 100%;
          --primary: 0 0% 100%;
          --primary-foreground: 0 0% 0%;
          --secondary: 0 0% 14.9%;
          --secondary-foreground: 0 0% 100%;
          --muted: 0 0% 14.9%;
          --muted-foreground: 0 0% 63.9%;
          --accent: 0 0% 14.9%;
          --accent-foreground: 0 0% 100%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 100%;
          --border: 0 0% 14.9%;
          --input: 0 0% 14.9%;
          --ring: 0 0% 100%;
        }
        
        body {
          background-color: #000;
          color: #fff;
        }
        
        /* Custom scrollbar for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #000;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
      {children}
    </div>
  );
}

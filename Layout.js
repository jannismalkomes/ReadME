import React from 'react';

export default function Layout({ children }) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            <style>{`
        :root {
          --background: 0 0% 3.9%;
          --foreground: 0 0% 98%;
          --card: 0 0% 7%;
          --card-foreground: 0 0% 98%;
          --popover: 0 0% 7%;
          --popover-foreground: 0 0% 98%;
          --primary: 38 92% 50%;
          --primary-foreground: 0 0% 100%;
          --secondary: 0 0% 14.9%;
          --secondary-foreground: 0 0% 98%;
          --muted: 0 0% 14.9%;
          --muted-foreground: 0 0% 63.9%;
          --accent: 0 0% 14.9%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 98%;
          --border: 0 0% 14.9%;
          --input: 0 0% 14.9%;
          --ring: 38 92% 50%;
        }
        
        body {
          background-color: hsl(0 0% 3.9%);
          color: hsl(0 0% 98%);
        }
        
        /* Custom scrollbar for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: hsl(0 0% 7%);
        }
        
        ::-webkit-scrollbar-thumb {
          background: hsl(0 0% 20%);
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: hsl(0 0% 30%);
        }

        /* Date input styling for dark mode */
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}</style>
            {children}
        </div>
    );
}
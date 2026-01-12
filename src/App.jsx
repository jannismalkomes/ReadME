import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import Player from './pages/Player';
import Import from './pages/Import';
import Editor from './pages/Editor';
import Settings from './pages/Settings';

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/player/:id" element={<Player />} />
                <Route path="/import" element={<Import />} />
                <Route path="/editor/:id" element={<Editor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}

export default App;

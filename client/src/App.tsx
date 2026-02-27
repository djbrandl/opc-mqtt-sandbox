import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';

function Dashboard() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Dashboard</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg mr-4">OPC/MQTT Harness</span>
          <NavLink to="/" end className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Dashboard</NavLink>
          <NavLink to="/opcua" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>OPC UA</NavLink>
          <NavLink to="/mqtt" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>MQTT</NavLink>
          <NavLink to="/activity" className={({ isActive }) => isActive ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}>Activity</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opcua" element={<div className="p-6">OPC UA Config</div>} />
          <Route path="/mqtt" element={<div className="p-6">MQTT Config</div>} />
          <Route path="/activity" element={<div className="p-6">Activity Monitor</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

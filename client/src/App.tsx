import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import OpcuaConfig from '@/pages/OpcuaConfig';
import MqttConfig from '@/pages/MqttConfig';
import ActivityMonitor from '@/pages/ActivityMonitor';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-lg mr-4 text-slate-100">OPC/MQTT Harness</span>
          <NavLink to="/" end className={({ isActive }) => `transition-colors duration-150 ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Dashboard</NavLink>
          <NavLink to="/opcua" className={({ isActive }) => `transition-colors duration-150 ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>OPC UA</NavLink>
          <NavLink to="/mqtt" className={({ isActive }) => `transition-colors duration-150 ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>MQTT</NavLink>
          <NavLink to="/activity" className={({ isActive }) => `transition-colors duration-150 ${isActive ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Activity</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/opcua" element={<OpcuaConfig />} />
          <Route path="/mqtt" element={<MqttConfig />} />
          <Route path="/activity" element={<ActivityMonitor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

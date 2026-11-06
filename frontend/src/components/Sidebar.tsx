
import { NavLink, useNavigate } from "react-router-dom";

import {
  BrainCircuit,
  LayoutDashboard,
  Files,
  Search,
  MessageSquareText,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();

  function logout() {
    sessionStorage.removeItem("access_token");
    navigate("/login", { replace: true });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrainCircuit size={28} />
        <span>Doc Intelligence</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard">
          <LayoutDashboard size={19} />
          Dashboard
        </NavLink>

        <NavLink to="/documents">
          <Files size={19} />
          Documents
        </NavLink>

        <NavLink to="/search">
          <Search size={19} />
          Semantic Search
        </NavLink>

        <NavLink to="/qa">
          <MessageSquareText size={19} />
          AI Question Answering
        </NavLink>
      </nav>

      <button className="logout-btn" onClick={logout}>
        <LogOut size={19} />
        Logout
      </button>
    </aside>
  );
}

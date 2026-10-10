// The site's own player dock (src/components/PlayerDock.jsx), mounted at the foot of /story/. It plays the
// album in order, remembers the track and position with the site (same storage key), and steps aside for
// any other player that announces itself with "e404-audio-play".
import { createRoot } from "react-dom/client";
import { PlayerDock } from "../components/PlayerDock.jsx";
import "./dock-base.css";
import "../styles/dock.css";

export function mountDock(el) {
  createRoot(el).render(<PlayerDock />);
}

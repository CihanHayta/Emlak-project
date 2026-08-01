import { Users, Home, Award, KeyRound } from "lucide-react";
import { HERO_STATS } from "../../data/stats";
import "./StatsBar.css";

// Maps the plain-string `icon` key from data/stats.js to an actual
// lucide-react icon component, so the data file itself stays JSX-free.
const ICONS = {
  users: Users,
  home: Home,
  award: Award,
  key: KeyRound,
};

/** The row of 4 trust stats ("500+ Mutlu Müşteri", ...) shown under the hero headline. */
export default function StatsBar() {
  return (
    <div className="stats-bar">
      {HERO_STATS.map((stat) => {
        const Icon = ICONS[stat.icon];
        return (
          <div key={stat.id} className="stats-bar__item">
            <Icon className="stats-bar__icon" />
            <div>
              <p className="stats-bar__value">{stat.value}</p>
              <p className="stats-bar__label">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

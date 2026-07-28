import { Users, Home, Award, KeyRound } from "lucide-react";
import { HERO_STATS } from "../../data/stats";

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
    <div className="flex flex-wrap gap-x-10 gap-y-4 pb-4">
      {HERO_STATS.map((stat) => {
        const Icon = ICONS[stat.icon];
        return (
          <div key={stat.id} className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-brand-gold" />
            <div>
              <p className="text-xl font-bold leading-tight text-white">{stat.value}</p>
              <p className="text-sm text-gray-300">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

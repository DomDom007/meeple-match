// Meeple Match: plans a board game night from who is coming, how long you have, and which games the group owns and enjoys.
import { useMemo, useState } from "react";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { Section, Stat, Stats } from "./ui/kit";

const T = "meeple-match";
type Game = { name: string; min: number; max: number; mins: number; weight: 1 | 2 | 3 };
// Player counts and play times as printed on the boxes; weight 1 light, 2 medium, 3 heavy.
const GAMES: Game[] = [
  { name: "Codenames", min: 4, max: 8, mins: 15, weight: 1 }, { name: "Just One", min: 3, max: 7, mins: 20, weight: 1 }, { name: "Skull", min: 3, max: 6, mins: 30, weight: 1 }, { name: "Sushi Go!", min: 2, max: 5, mins: 15, weight: 1 },
  { name: "Love Letter", min: 2, max: 4, mins: 20, weight: 1 }, { name: "Dixit", min: 3, max: 6, mins: 30, weight: 1 }, { name: "Wavelength", min: 2, max: 12, mins: 40, weight: 1 }, { name: "The Crew", min: 2, max: 5, mins: 20, weight: 2 },
  { name: "Ticket to Ride", min: 2, max: 5, mins: 60, weight: 1 }, { name: "Carcassonne", min: 2, max: 5, mins: 40, weight: 1 }, { name: "Azul", min: 2, max: 4, mins: 40, weight: 2 }, { name: "Splendor", min: 2, max: 4, mins: 30, weight: 2 },
  { name: "King of Tokyo", min: 2, max: 6, mins: 30, weight: 1 }, { name: "7 Wonders", min: 3, max: 7, mins: 30, weight: 2 }, { name: "Cascadia", min: 1, max: 4, mins: 45, weight: 2 }, { name: "Pandemic", min: 2, max: 4, mins: 45, weight: 2 },
  { name: "Catan", min: 3, max: 4, mins: 90, weight: 2 }, { name: "Wingspan", min: 1, max: 5, mins: 70, weight: 2 }, { name: "Dominion", min: 2, max: 4, mins: 30, weight: 2 }, { name: "Jaipur", min: 2, max: 2, mins: 30, weight: 1 },
  { name: "Patchwork", min: 2, max: 2, mins: 30, weight: 1 }, { name: "Root", min: 2, max: 4, mins: 90, weight: 3 }, { name: "Scythe", min: 1, max: 5, mins: 115, weight: 3 }, { name: "Terraforming Mars", min: 1, max: 5, mins: 120, weight: 3 },
  { name: "Brass: Birmingham", min: 2, max: 4, mins: 120, weight: 3 }, { name: "Spirit Island", min: 1, max: 4, mins: 120, weight: 3 },
];
type Player = { id: string; name: string; phone: string; owns: string[]; loves: string[]; weight: 1 | 2 | 3 };
const W = ["", "Light", "Medium", "Heavy"];
const SP: Player[] = [
  { id: "p1", name: "Amine", phone: "", owns: ["Catan", "Codenames", "Azul"], loves: ["Azul", "Catan"], weight: 2 }, { id: "p2", name: "Sarra", phone: "", owns: ["Wingspan", "Cascadia", "The Crew"], loves: ["Wingspan", "The Crew"], weight: 2 },
  { id: "p3", name: "Mehdi", phone: "", owns: ["Root", "Brass: Birmingham"], loves: ["Root", "Brass: Birmingham"], weight: 3 }, { id: "p4", name: "Ons", phone: "", owns: ["Just One", "Dixit"], loves: ["Just One", "Codenames"], weight: 1 },
  { id: "p5", name: "Youssef", phone: "", owns: ["Ticket to Ride", "7 Wonders"], loves: ["7 Wonders"], weight: 2 }, { id: "p6", name: "Rim", phone: "", owns: ["Skull", "King of Tokyo"], loves: ["Skull", "Just One"], weight: 1 },
];

export default function MeepleMatch() {
  const [players, setPlayers] = useStored<Player[]>(T, "players", SP);
  const [coming, setComing] = useStored<string[]>(T, "coming", ["p1", "p2", "p3", "p4", "p5", "p6"]);
  const [hours, setHours] = useStored(T, "hours", 3);
  const [night, setNight] = useStored(T, "night", { when: "Friday 20:00", where: "Café Le Pion, El Manar" });
  const [edit, setEdit] = useState<string | null>(null);
  const here = players.filter(p => coming.includes(p.id));
  const owned = new Set(here.flatMap(p => p.owns));
  const avgW = here.reduce((a, p) => a + p.weight, 0) / Math.max(1, here.length);

  // Score each owned game for a group: fits the count and time, matches taste, and people love it.
  const score = (g: Game, grp: Player[]) => { if (grp.length < g.min || grp.length > g.max) return -1; const love = grp.filter(p => p.loves.includes(g.name)).length; const wfit = 1 - Math.abs(g.weight - grp.reduce((a, p) => a + p.weight, 0) / grp.length) / 2; return love * 2 + wfit * 2 + (g.max >= grp.length + 1 ? 0.3 : 0); };
  const plan = useMemo(() => {
    const pool = GAMES.filter(g => owned.has(g.name) && g.mins <= hours * 60);
    const n = here.length;
    // Split into tables of 3 to 5 when the group is large, grouping people by preferred weight.
    const tables = n <= 6 ? [here] : (() => { const k = Math.ceil(n / 5); const sorted = [...here].sort((a, b) => a.weight - b.weight); return Array.from({ length: k }, (_, i) => sorted.filter((_, j) => j % k === i)); })();
    return tables.map(t => { const ranked = pool.map(g => ({ g, s: score(g, t) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s); const lineup: Game[] = []; let left = hours * 60; for (const r of ranked) if (r.g.mins <= left && lineup.length < 4) { lineup.push(r.g); left -= r.g.mins + 10; } return { t, lineup, ranked: ranked.slice(0, 6) }; });
  }, [here, hours, owned]);
  const setP = (id: string, p: Partial<Player>) => setPlayers(players.map(x => (x.id === id ? { ...x, ...p } : x)));
  const invite = `Game night ${night.when} at ${night.where}! Plan: ${plan.map((x, i) => `${plan.length > 1 ? `Table ${i + 1}: ` : ""}${x.lineup.map(g => g.name).join(", ")}`).join(". ")}. Bring: ${[...new Set(plan.flatMap(x => x.lineup.map(g => `${g.name} (${here.find(p => p.owns.includes(g.name))?.name})`)))].join(", ")}.`;

  return (
    <div className="stack">
      <Section title="Game night" aside={<a className="btn small primary" href={waLink(invite)} target="_blank" rel="noreferrer">Send the plan to the group</a>}>
        <Stats><Stat value={here.length} label="Coming" /><Stat value={owned.size} label="Games between them" /><Stat value={W[Math.round(avgW)]} label="Group's taste" /><Stat value={plan.length} label={plan.length > 1 ? "Tables" : "Table"} /></Stats>
        <div className="row" style={{ marginTop: 12 }}><label className="field"><span>When</span><input className="input" value={night.when} onChange={e => setNight({ ...night, when: e.target.value })} /></label><label className="field"><span>Where</span><input className="input" value={night.where} onChange={e => setNight({ ...night, where: e.target.value })} /></label><label className="field" style={{ flex: "0 0 140px" }}><span>Hours to play</span><select className="input" value={hours} onChange={e => setHours(+e.target.value)}>{[1, 1.5, 2, 3, 4, 5].map(h => <option key={h} value={h}>{h}</option>)}</select></label></div>
      </Section>
      <Section title="Who's coming">
        <div className="row" style={{ gap: 6 }}>{players.map(p => <button key={p.id} className="btn small" aria-pressed={coming.includes(p.id)} style={coming.includes(p.id) ? { background: "var(--ink)", color: "var(--bg)" } : undefined} onClick={() => setComing(coming.includes(p.id) ? coming.filter(x => x !== p.id) : [...coming, p.id])}>{p.name} · {W[p.weight]}</button>)}<button className="btn ghost small" onClick={() => { const n = { id: uid(), name: "New player", phone: "", owns: [], loves: [], weight: 2 as const }; setPlayers([...players, n]); setComing([...coming, n.id]); setEdit(n.id); }}>Add a player</button></div>
      </Section>
      {plan.map((x, i) => (
        <Section key={i} title={plan.length > 1 ? `Table ${i + 1}: ${x.t.map(p => p.name).join(", ")}` : "Suggested lineup"}>
          {x.lineup.length === 0 ? <p className="empty-note">Nobody coming owns a game that fits {x.t.length} players in {hours} hours.</p> : <ol className="mm-line">{x.lineup.map(g => <li key={g.name}><strong>{g.name}</strong><span className="note">{g.min} to {g.max} players · {g.mins} min · {W[g.weight]} · bring from {here.find(p => p.owns.includes(g.name))?.name}</span>{here.filter(p => p.loves.includes(g.name)).length > 0 && <span className="pill good">Loved by {here.filter(p => p.loves.includes(g.name)).map(p => p.name).join(", ")}</span>}</li>)}</ol>}
          {x.ranked.length > x.lineup.length && <p className="note" style={{ marginTop: 8 }}>Also fits: {x.ranked.filter(r => !x.lineup.includes(r.g)).map(r => r.g.name).join(", ")}</p>}
        </Section>))}
      <Section title="Players and their shelves">
        {players.map(p => <div key={p.id} className="mm-p">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}><strong>{p.name}</strong><span className="note">owns {p.owns.length} · loves {p.loves.join(", ") || "nothing yet"}</span><button className="btn ghost small" onClick={() => setEdit(edit === p.id ? null : p.id)}>{edit === p.id ? "Done" : "Edit"}</button></div>
          {edit === p.id && <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            <div className="row"><input className="input" style={{ flex: 1 }} aria-label="Name" value={p.name} onChange={e => setP(p.id, { name: e.target.value })} /><select className="input" aria-label="Likes" value={p.weight} onChange={e => setP(p.id, { weight: +e.target.value as 1 | 2 | 3 })}><option value={1}>Likes light games</option><option value={2}>Likes medium games</option><option value={3}>Likes heavy games</option></select><input className="input" style={{ flex: 1 }} aria-label="WhatsApp" placeholder="WhatsApp" value={p.phone} onChange={e => setP(p.id, { phone: e.target.value })} /></div>
            <div className="mm-games">{GAMES.map(g => { const o = p.owns.includes(g.name), l = p.loves.includes(g.name); return <span key={g.name} className={"mm-g" + (o ? " own" : "") + (l ? " love" : "")}>{g.name}<button onClick={() => setP(p.id, { owns: o ? p.owns.filter(x => x !== g.name) : [...p.owns, g.name] })}>{o ? "Owned" : "Own it"}</button><button onClick={() => setP(p.id, { loves: l ? p.loves.filter(x => x !== g.name) : [...p.loves, g.name] })}>{l ? "Loved" : "Love it"}</button></span>; })}</div>
            <button className="btn ghost small danger" style={{ alignSelf: "flex-start" }} onClick={() => { setPlayers(players.filter(x => x.id !== p.id)); setComing(coming.filter(x => x !== p.id)); }}>Remove player</button>
          </div>}
        </div>)}
      </Section>
      <style>{`.mm-line{margin:0;padding-left:20px;display:grid;gap:10px}.mm-line li{display:grid;gap:3px}.mm-line .pill{justify-self:start}.mm-p{padding:10px 0;border-bottom:1px solid var(--line)}
      .mm-games{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}.mm-g{display:flex;gap:4px;align-items:center;border:1px solid var(--line);border-radius:8px;padding:4px 6px;font-size:13px}.mm-g button{border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:6px;font-size:11px;padding:2px 6px;cursor:pointer;margin-left:auto}.mm-g button+button{margin-left:0}.mm-g.own{border-color:var(--accent)}.mm-g.love{background:color-mix(in srgb,var(--good) 10%,transparent)}`}</style>
    </div>
  );
}

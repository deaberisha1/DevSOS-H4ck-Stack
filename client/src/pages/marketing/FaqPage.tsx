import { useState } from "react";
import { Link } from "react-router-dom";
import { IconPlus, IconArrowRight, IconClose, IconKey, IconHandRaised, IconUsers, IconChart, IconShield } from "../../components/icons";
import shared from "../../styles/marketing.module.css";
import css from "./GuidePages.module.css";
const GROUPS: Array<{ title: string; items: Array<{ q: string; a: string }> }> = [
  {
    title: "Joining",
    items: [
      {
        q: "Do I need an account?",
        a: "No. You need the event code and a display name. Nothing to install, nothing to verify, no password to forget.",
      },
      {
        q: "What is the table label for?",
        a: "It is how the mentor finds you. Whatever the room uses — B4, the corner by the window, Table 12 — as long as somebody could walk to it.",
      },
      {
        q: "I joined as a participant but I am actually a mentor.",
        a: "Ask the organizers for the mentor invitation, then join again with it. Roles are assigned at join time by the server.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes, and it is designed phone-first: the whole flow works on a 360px screen with no sideways scrolling.",
      },
    ],
  },
  {
    title: "Asking for help",
    items: [
      {
        q: "How many requests can my team have open?",
        a: "One at a time. When it is resolved or cancelled you can ask again. It keeps the queue an accurate picture of the room.",
      },
      {
        q: "How long is the wait?",
        a: "The app never guesses. It shows elapsed time — \"Waiting for 4m 12s\" — because a made-up estimate is worse than an honest number.",
      },
      {
        q: "We solved it ourselves. What now?",
        a: "Cancel the request. That is a good outcome, not a failure, and it frees a mentor for the next team.",
      },
      {
        q: "Can other teams read what I wrote?",
        a: "No. The description and the steps you tried go to you, the mentor helping you, and the organizers. Other teams see only the title and topic in the queue.",
      },
      {
        q: "My submission failed. Did it go through twice?",
        a: "No. Each submission carries an id that stays the same across retries, so a retried send is recognised as the same request rather than a second one.",
      },
    ],
  },
  {
    title: "Mentoring",
    items: [
      {
        q: "What if I claim something I cannot solve?",
        a: "Release it. It goes back to the queue with its original age, so it lands near the top and someone else picks it up. Releasing is routine.",
      },
      {
        q: "Two of us claimed the same request.",
        a: "One of you got it. The other sees \"Another mentor took this request\" immediately and a reloaded queue — the app does not retry silently behind you.",
      },
      {
        q: "Does going Away drop my current request?",
        a: "No. Away only stops you being counted as free capacity. Anything already assigned to you stays yours until you resolve or release it.",
      },
      {
        q: "Can I see requests outside my skills?",
        a: "Yes — the All requests tab ignores skills and sorts purely by age.",
      },
    ],
  },
  {
    title: "Running an event",
    items: [
      {
        q: "How many mentors do we need?",
        a: "Watch the waiting count rather than a ratio. If it stays above a handful for more than ten minutes at a time, you need more people on the floor.",
      },
      {
        q: "A mentor disappeared with a claimed request.",
        a: "Release it from the organizer dashboard. It returns to the queue keeping its original age.",
      },
      {
        q: "Can we change the topic list?",
        a: "The eight topics are fixed in the app today. If your event needs a different set, it is a change organizers ask for before the event opens.",
      },
      {
        q: "What happens when we close the event?",
        a: "New requests stop, the queue becomes read-only, and every screen says the event has closed rather than failing quietly.",
      },
    ],
  },
  {
    title: "Reliability and access",
    items: [
      {
        q: "The venue wifi is terrible. Will it break?",
        a: "It degrades on purpose. If the live connection drops, screens refresh every five seconds and show a banner saying live updates are unavailable. What was on screen stays on screen, marked stale.",
      },
      {
        q: "Does it work with a screen reader?",
        a: "Yes. Status changes are announced through a polite live region, every field has a real label, errors are tied to their field, and the full flow is keyboard-operable with visible focus.",
      },
      {
        q: "Does my session continue after the event?",
        a: "Sessions end with the event. There are no accounts to delete because there were never any accounts.",
      },
    ],
  },
];

const GROUP_ICONS = [IconKey, IconHandRaised, IconUsers, IconChart, IconShield];
export default function FaqPage() {
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All questions");
  const [open,setOpen]=useState<string[]>([]);
  const normalized=query.trim().toLowerCase();
  const filtered=GROUPS.filter(group=>category==="All questions"||category===group.title).map(group=>({...group,items:group.items.filter(item=>`${item.q} ${item.a}`.toLowerCase().includes(normalized))})).filter(group=>group.items.length);
  const count=filtered.reduce((sum,group)=>sum+group.items.length,0);
  const ids=filtered.flatMap(group=>group.items.map(item=>item.q));
  const expanded=ids.length>0&&ids.every(id=>open.includes(id));
  function reset(){setQuery("");setCategory("All questions");setOpen([]);}
  return <div className={css.page}>
    <section className={css.faqHero}><p className={css.kicker}>A LITTLE CLARITY GOES A LONG WAY</p><h1>Good questions.<br /><span>Straight answers.</span></h1><p>From your first event code to the last request of the night.<br />Find what you need and get back to building.</p><div className={css.searchBox}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><label className="visually-hidden" htmlFor="faq-search">Search questions and answers</label><input id="faq-search" type="search" placeholder="Search a question, topic or keyword…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")}><IconClose size={17}/></button>}</div><p className={css.searchHint}>Try “mentor”, “waiting” or “wifi”</p></section>
    <section className={`${css.section} ${css.faqLayout}`}><aside className={css.sidebar}><p className={css.kicker}>FIND YOUR ANSWER</p><div className={css.categories} role="group" aria-label="Filter questions by topic"><button type="button" aria-pressed={category==="All questions"} onClick={()=>setCategory("All questions")}>All questions<span>{GROUPS.reduce((sum,g)=>sum+g.items.length,0)}</span></button>{GROUPS.map((group,i)=>{const Icon=GROUP_ICONS[i]!;return <button type="button" key={group.title} aria-pressed={category===group.title} onClick={()=>setCategory(group.title)}><Icon size={17}/>{group.title}<span>{group.items.length}</span></button>;})}</div><div className={css.sidebarNote}><IconUsers size={25}/><h3>At an event right now?</h3><p>Your organizer can help with event codes, mentor invitations and access.</p><Link className={shared.arrowLink} to="/how-it-works">See how it works<IconArrowRight size={16}/></Link></div></aside>
    <div><div className={css.resultsBar}><p role="status">{count} {count===1?"answer":"answers"}{normalized?` for “${query.trim()}”`:" to explore"}</p><button type="button" disabled={!count} onClick={()=>setOpen(prev=>expanded?prev.filter(id=>!ids.includes(id)):[...new Set([...prev,...ids])])}>{expanded?"Collapse all":"Expand all"}</button></div>{filtered.length?filtered.map(group=><section className={css.questionGroup} key={group.title}><h2>{group.title}<span>{group.items.length}</span></h2><div>{group.items.map(item=><details key={item.q} className={css.question} open={open.includes(item.q)}><summary onClick={event=>{event.preventDefault();setOpen(prev=>prev.includes(item.q)?prev.filter(id=>id!==item.q):[...prev,item.q]);}}>{item.q}<IconPlus size={19}/></summary><p>{item.a}</p></details>)}</div></section>):<div className={css.empty}><IconHandRaised size={32}/><h2>No answers found.</h2><p>Try a shorter keyword or choose a different topic.</p><button type="button" onClick={reset}>Clear search and filters<IconArrowRight size={17}/></button></div>}</div></section>
    <section className={css.guideLinks}><div><p className={css.kicker}>GO A LITTLE DEEPER</p><h2>The right guide.<br />For your side of the room.</h2></div><Link to="/for-mentors"><IconUsers size={24}/><strong>For mentors</strong><span>Skills, claims and better conversations.</span><IconArrowRight size={20}/></Link><Link to="/for-organizers"><IconChart size={24}/><strong>For organizers</strong><span>Preparation, visibility and a calmer event.</span><IconArrowRight size={20}/></Link></section>
    <section className={css.closing}><p className={css.kicker}>READY WHEN YOU ARE</p><h2>Less wondering.<br /><span>More building.</span></h2><div className={shared.ctaRow}><Link className={shared.btnPrimary} to="/join">Join your event<IconArrowRight size={18}/></Link><Link className={css.lightLink} to="/how-it-works">Explore the walkthrough<IconArrowRight size={18}/></Link></div></section>
  </div>;
}



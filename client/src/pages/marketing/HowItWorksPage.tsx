import { useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../../components/marketing/Reveal";
import { LogoMark } from "../../components/brand/Logo";
import QueueDemo from "../../components/marketing/QueueDemo";
import { IconArrowRight, IconUsers, IconChart, IconHandRaised, IconCheck, IconKey, IconPen, IconClock, IconShield, IconWifiOff, IconPlus, IconTarget } from "../../components/icons";
import shared from "../../styles/marketing.module.css";
import css from "./HowItWorksPage.module.css";

const roles = [
  { name: "Participants", Icon: IconHandRaised, title: "Your idea stays at the center.", text: "Ask from your table, share the context once, and see exactly who is coming to help. Your full request stays between you, your mentor and the organizers.", detail: "One active request. A clear next step.", link: "/join", cta: "Join your event" },
  { name: "Mentors", Icon: IconUsers, title: "Your skills go where they matter.", text: "Choose your skills and find the requests that match. Read what the team has tried, claim a request, and head over with a useful starting point.", detail: "Less searching. More helping.", link: "/for-mentors", cta: "Explore the mentor guide" },
  { name: "Organizers", Icon: IconChart, title: "The whole room, in view.", text: "See waiting requests, active conversations and long waits together. Release a stuck claim, close a finished request, or bring in another mentor when the room needs one.", detail: "A shared picture. Better decisions.", link: "/for-organizers", cta: "Explore the organizer guide" },
];
const journey = [
  { time: "02:00", status: "Waiting", title: "A blocker becomes a request.", text: "Your API call keeps failing. Add a short title, explain the problem, choose Backend and share your table. The queue starts tracking how long you've waited.", owner: "Team Orbit · Table B4", detail: "API returns 401 in the browser", action: "Request sent", Icon: IconPen },
  { time: "02:02", status: "Claimed", title: "Someone knows where to start.", text: "A mentor with backend experience spots your request and claims it. Their name appears on your card, so you know who is on the way.", owner: "Alex · Backend mentor", detail: "Alex is on the way to table B4", action: "Mentor assigned", Icon: IconUsers },
  { time: "02:03", status: "In progress", title: "The conversation starts with context.", text: "Alex arrives and starts helping. Your waiting timer becomes a time-with-mentor timer. You can get straight to the problem instead of repeating the story.", owner: "Team Orbit + Alex", detail: "Checking the authorization header", action: "Working together", Icon: IconTarget },
  { time: "02:09", status: "Resolved", title: "Back to the thing you came to build.", text: "The request works. Mark the blocker resolved and get back to your project. The mentor is free to help the next team.", owner: "Team Orbit · Table B4", detail: "200 OK. You're unblocked.", action: "Request resolved", Icon: IconCheck },
];
const faqs = [
  ["What do I need to join?", "An event code, a display name and a table label. Mentors also use the invitation provided by their organizer. Your invitation determines your access."],
  ["What should I put in a request?", "Write a short title, explain what is going wrong, and add what you already tried. Choose one main topic and up to two extras, then check your table label. Each team has one active request at a time."],
  ["How is the mentor queue sorted?", "Main-topic skill matches come first, then other topic matches, then everything else. Within each group, the oldest request comes first. The All requests view sorts by age alone. Waits longer than ten minutes are flagged."],
  ["Can I cancel or release a request?", "If you fix the problem yourself or no longer need help, cancel it. A mentor who cannot continue can release it back to Waiting. The request keeps its original queue age."],
  ["What if two mentors claim at once?", "Only one claim succeeds. The other mentor is told that someone else took the request and receives an updated queue."],
  ["What happens when the event closes?", "The queue becomes read-only, new requests stop, and everyone sees a clear event-closed message."],
];
export default function HowItWorksPage() {
  const [role, setRole] = useState(0);
  const [step, setStep] = useState(0);
  const selectedRole = roles[role]!;
  const selectedStep = journey[step]!;
  return <div className={css.page}>
    <section className={css.hero}>
      <p className={css.kicker}>THE DEVSOS ECOSYSTEM</p>
      <h1>One room.<br />Everything <span>connected.</span></h1>
      <p className={css.heroCopy}>Your team. The right mentor. A clear way forward.<br />One shared flow that keeps everyone building.</p>
      <div className={css.heroVisual} aria-hidden="true">
        <svg viewBox="0 0 900 220" fill="none"><path d="M135 110h235m160 0h235" stroke="#b996e0" strokeWidth="2" strokeDasharray="6 8"/><ellipse cx="450" cy="110" rx="155" ry="78" stroke="#c8abe6"/><ellipse cx="450" cy="110" rx="120" ry="95" stroke="#c8abe6" transform="rotate(-20 450 110)"/><circle cx="450" cy="110" r="73" fill="#00004e"/><path d="m430 88-20 22 20 22m40-44 20 22-20 22m-14-48-12 52" stroke="#c8f08f" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="302" cy="88" r="9" fill="#9cdd2e"/><circle cx="592" cy="142" r="7" fill="#9c51e8"/></svg>
        <div className={css.heroNode}><IconHandRaised size={25} /><span>Ask for help</span></div><div className={css.heroNode}><IconUsers size={25} /><span>Build together</span></div>
      </div>
      <a className={css.scrollLink} href="#the-problem">Discover the flow <IconArrowRight size={17} /></a>
    </section>
    <section id="the-problem" className={css.section}>
      <Reveal><div className={css.heading}><div><p className={css.kicker}>THE DISCONNECT</p><h2>The help is in the room.<br />Finding it is the hard part.</h2></div><p>A raised hand. A message lost in chat. A mentor walking past the table that needs them. Good people, disconnected information.</p></div></Reveal>
      <div className={css.fragments}>{[{Icon:IconHandRaised,label:"THE TEAM",text:"We're stuck. Who can help?"},{Icon:IconUsers,label:"THE MENTOR",text:"Who needs what I know?"},{Icon:IconChart,label:"THE ORGANIZER",text:"Is anyone waiting too long?"}].map(({Icon,label,text},i)=><Reveal key={label} delayMs={i*100}><article><Icon size={23}/><p>{label}</p><h3>{text}</h3></article></Reveal>)}</div>
    </section>
    <section className={css.ecosystem}><div className={css.section}>
      <div className={css.centerHeading}><p className={css.kicker}>CONNECTED BY DESIGN</p><h2>Three perspectives.<br /><span>One shared queue.</span></h2><p>Choose a role to see how each part of the room connects.</p></div>
      <div className={css.roleGrid}>
        <div className={css.network}>
          <div className={css.hub}><LogoMark size={49}/><strong>DevSOS</strong><small>The shared queue</small></div>
          <div className={css.roleButtons} role="group" aria-label="Explore event roles">{roles.map(({name,Icon},i)=><button type="button" key={name} aria-pressed={role===i} aria-controls="role-detail" onClick={()=>setRole(i)}><Icon size={23}/><span>{name}</span><IconArrowRight size={16}/></button>)}</div>
        </div>
        <div id="role-detail" className={css.roleDetail} aria-live="polite"><div key={role} className={css.swap}><p className={css.kicker}>{selectedRole.name}</p><h3>{selectedRole.title}</h3><p>{selectedRole.text}</p><div className={css.roleNote}><IconCheck size={18}/>{selectedRole.detail}</div><Link className={shared.arrowLink} to={selectedRole.link}>{selectedRole.cta}<IconArrowRight size={18}/></Link></div></div>
      </div>
    </div></section>
    <section className={css.section}>
      <div className={css.heading}><div><p className={css.kicker}>FOLLOW THE CONNECTION</p><h2>One late-night bug.<br />A different kind of ending.</h2></div><p>Follow an example request from the first question to the final fix. Times below illustrate the flow, not promised response times.</p></div>
      <div className={css.journey}>
        <ol className={css.timeline}>{journey.map((item,i)=><li key={item.status}><button type="button" aria-pressed={step===i} aria-controls="journey-detail" onClick={()=>setStep(i)}><span className={css.time}>{item.time}</span><span className={css.timelineDot}/><span><small>{item.status}</small><strong>{item.title}</strong></span></button></li>)}</ol>
        <div id="journey-detail" className={css.journeyPanel} aria-live="polite"><div key={step} className={css.swap}><div className={css.exampleLabel}>EXAMPLE REQUEST <span>0{step+1} / 04</span></div><div className={css.requestCard}><div className={css.requestTop}><selectedStep.Icon size={25}/><span>{selectedStep.status}</span></div><p>{selectedStep.owner}</p><h3>{selectedStep.detail}</h3><div className={css.requestFooter}><IconClock size={16}/>{selectedStep.time}<span>{selectedStep.action}</span></div></div><p className={css.journeyCopy}>{selectedStep.text}</p></div><div className={css.controls}><button type="button" disabled={step===0} onClick={()=>setStep(step-1)}>Previous</button><button type="button" onClick={()=>setStep(step===3?0:step+1)}>{step===3?"Replay the journey":"Next step"}<IconArrowRight size={17}/></button></div></div>
      </div>
    </section>
    <section className={css.demoSection}><div className={`${css.section} ${css.demoGrid}`}><Reveal><p className={css.kicker}>TRY THE CONNECTION</p><h2>Less explanation.<br />More “I've got this.”</h2><p className={css.bodyCopy}>Take the mentor's seat in this interactive demo. Claim a request, start helping and resolve it. Watch the queue change with you.</p><ul className={css.checks}><li><IconCheck size={18}/> Context before the conversation</li><li><IconCheck size={18}/> One mentor owns each request</li><li><IconCheck size={18}/> Clear status at every step</li></ul></Reveal><QueueDemo/></div></section>
    <section className={css.section}><div className={css.heading}><div><p className={css.kicker}>THE DETAILS THAT MATTER</p><h2>Made for real rooms.<br />And imperfect Wi-Fi.</h2></div></div><div className={css.reliability}>{[{Icon:IconKey,title:"An invitation is enough",body:"Join with the event code and your name. Mentors use their organizer's invitation to access the mentor workspace."},{Icon:IconShield,title:"Everyone knows their part",body:"Request details stay with the team, their mentor and the organizers. One successful claim keeps two mentors from making the same trip."},{Icon:IconWifiOff,title:"A dropped connection isn't the end",body:"If live updates disconnect, the app refreshes every five seconds. Existing data stays visible with a clear connection notice."}].map(({Icon,title,body})=><Reveal key={title}><article><Icon size={25}/><h3>{title}</h3><p>{body}</p></article></Reveal>)}</div></section>
    <section className={`${css.section} ${css.faqSection}`}><div><p className={css.kicker}>THE PRACTICAL QUESTIONS</p><h2>Know what<br />happens next.</h2></div><div className={shared.faq}>{faqs.map(([q,a])=><details key={q} className={shared.faqItem}><summary>{q}<IconPlus size={19} className={shared.faqIcon}/></summary><p className={shared.faqBody}>{a}</p></details>)}</div></section>
    <section className={css.closing}><LogoMark size={52}/><p className={css.kicker}>ONE ROOM. CONNECTED.</p><h2>Your next breakthrough<br />starts with a question.</h2><div className={shared.ctaRow}><Link className={shared.btnPrimary} to="/join">Join your event<IconArrowRight size={19}/></Link><Link className={css.secondaryLink} to="/for-organizers">Running an event? <IconArrowRight size={18}/></Link></div></section>
  </div>;
}

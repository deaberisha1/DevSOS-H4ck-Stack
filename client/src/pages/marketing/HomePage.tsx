import HeroArtwork from "../../components/marketing/HeroArtwork";
import { Link } from "react-router-dom";
import QueueDemo from "../../components/marketing/QueueDemo";
import RoleTabs from "../../components/marketing/RoleTabs";
import Reveal from "../../components/marketing/Reveal";
import { IconArrowRight, IconCheck, IconKey, IconPen, IconUsers, IconCheckCircle, IconPlus, IconBolt, IconTarget, IconChart } from "../../components/icons";
import shared from "../../styles/marketing.module.css";
import css from "./HomePage.module.css";

const steps = [
  { Icon: IconKey, title: "You're in.", body: "Enter your event code, name and table. No account. No password. Just start building." },
  { Icon: IconPen, title: "Tell us what's stuck.", body: "Share the problem, your stack and what you've tried. Give your mentor a head start." },
  { Icon: IconUsers, title: "Meet your mentor.", body: "A mentor claims your request and comes to your table. You'll know who's on the way." },
  { Icon: IconCheckCircle, title: "Back to building.", body: "Work through the blocker together. Mark it resolved and get back to the good part." },
];
const questions = [
  ["Do I need an account?", "No. Join with your event code and a display name. Your session belongs to that event."],
  ["How does mentor matching work?", "Mentors choose their skills. Requests with matching topics appear first, with the oldest requests first within each matching group."],
  ["What if the venue Wi-Fi drops?", "When live updates disconnect, the app falls back to refreshing every five seconds and shows a connection notice."],
  ["Who can see my request?", "Your full request is visible to you, the mentor helping you and the event organizers."],
];
export default function HomePage() {
  return <>
    <section className={css.hero}>
      <div className={css.heroInner}>
        <div className={css.intro}>
          <p className={css.eyebrow}><span /> LESS WAITING. MORE BUILDING.</p>
          <h1><span className={css.headlineLine}>Big ideas.</span><span className={css.headlineLine}>Small blockers.</span><span className={`${css.headlineLine} ${css.headlineAccent}`}>Let's fix that.</span></h1>
          <p className={css.lede}>Your next breakthrough is a conversation away. Connect with the right mentor, right at your table.</p>
          <div className={shared.ctaRow}>
            <Link className={shared.btnPrimary} to="/join">Join your event <IconArrowRight size={19} /></Link>
            <a className={shared.btnGhost} href="#playground">Try it in action <IconArrowRight size={19} /></a>
          </div>
          <p className={css.note}><IconCheck size={16} /> No account needed <span /> Made for hackathons</p><HeroArtwork />
        </div>
        <div className={css.playground} id="playground">
          <div className={css.demoLabel}><span><IconBolt size={16} /> THE HELP DESK, REIMAGINED</span><span>01 / LIVE DEMO</span></div>
          <QueueDemo />
          <div className={css.demoCaption}><span className={css.captionLine} /> Go ahead. Be someone's breakthrough.</div>
        </div>
      </div>
    </section>
    <div className={css.topicStrip} aria-label="Topics mentors can help with"><span>WHATEVER YOUR STACK.</span>{["React", "Backend", "Database", "Deployment", "Git", "UI / UX"].map(x => <span key={x}>{x}</span>)}</div>
    <section className={css.section}>
      <Reveal><div className={css.sectionHeading}><div><p className={css.eyebrow}>BUILT AROUND PEOPLE</p><h2>A better flow.<br />For the whole room.</h2></div><p>Great events make space for every question. DevSOS connects the people who need a hand with the people who can lend one.</p></div></Reveal>
      <div className={css.benefits}>{[
        { Icon: IconBolt, number: "01", title: "Keep your momentum", body: "Ask once. Follow your request in real time. Spend less time looking for help and more time creating." },
        { Icon: IconTarget, number: "02", title: "Find your people", body: "React bug or deployment mystery? Skill-based sorting helps mentors find the questions they know best." },
        { Icon: IconChart, number: "03", title: "See the bigger picture", body: "A clear view of the queue helps organizers spot long waits and get support where it's needed." },
      ].map(({Icon, number, title, body}, i) => <Reveal key={number} delayMs={i * 110}><article><div className={css.cardTop}><Icon size={28} /><span>{number}</span></div><h3>{title}</h3><p>{body}</p></article></Reveal>)}</div>
    </section>
    <section className={css.process}><div className={css.section}>
      <div className={css.sectionHeading}><div><p className={css.eyebrow}>FROM BLOCKED TO BUILDING</p><h2>One request.<br />A clear way forward.</h2></div><Link to="/how-it-works" className={shared.arrowLink}>Explore the full walkthrough <IconArrowRight size={18} /></Link></div>
      <ol className={css.steps}>{steps.map(({Icon, title, body}, i) => <li key={title}><Reveal delayMs={i * 100}><div className={css.stepTop}><span>0{i + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{body}</p></Reveal></li>)}</ol>
    </div></section>
    <section className={css.section}><p className={css.eyebrow}>YOUR EVENT. YOUR PERSPECTIVE.</p><h2 className={css.roleHeading}>Different roles. Same team.</h2><Reveal><RoleTabs /></Reveal></section>
    <section className={`${css.section} ${css.questions}`}><div><p className={css.eyebrow}>GOOD QUESTIONS</p><h2>A little clarity<br />before you start.</h2><Link className={shared.arrowLink} to="/faq">All questions <IconArrowRight size={18} /></Link></div><div className={shared.faq}>{questions.map(([q,a]) => <details className={shared.faqItem} key={q}><summary>{q}<IconPlus size={20} className={shared.faqIcon} /></summary><p className={shared.faqBody}>{a}</p></details>)}</div></section>
    <section className={css.closing}><div><p className={css.eyebrow}>DON'T LET A BUG STEAL YOUR WEEKEND.</p><h2>Build something<br />worth staying up for.</h2><Link className={shared.btnPrimary} to="/join">Let's get you unstuck <IconArrowRight size={20} /></Link></div><svg viewBox="0 0 240 240" aria-hidden="true"><path d="M80 35 15 120l65 85M160 35l65 85-65 85M140 55l-40 130" fill="none" stroke="currentColor" strokeWidth="18" strokeLinejoin="round" /></svg></section>
  </>;
}


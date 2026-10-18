// English (/en/). Values may contain simple HTML (<br>, <span>).
export default {
  name: 'English',
  hint: 'This page is available in English',
  meta: {
    title: 'QuitVow · Quit gambling with a system, not willpower',
    description: 'QuitVow is a commitment app that helps you quit gambling and betting with witnesses, a crisis mode and daily check-ins. Available on Google Play for Android.',
    ogTitle: 'QuitVow · A system, not willpower.',
    ogDescription: 'Witnesses, a two-key exit, crisis mode and one cell filled every day. A commitment app for quitting gambling.',
    ogLocale: 'en_US',
  },
  nav: { chip: 'Android · Google Play', language: 'Language' },
  hero: {
    kicker: 'A system for quitting gambling',
    title: 'A system,<br>not willpower.',
    lead: 'A promise made alone breaks easily in a crisis. QuitVow ties your promise to people you trust, to rules written in advance, and to a calendar that fills up every day.',
    soonSmall: 'Android', soon: 'Get it on Google Play',
    note: 'First 7 days free. No real-money transactions, no bank connection.',
  },
  img: {
    home: 'QuitVow home screen: day 23 of a 90-day pack, filled cells and the "I\'m in crisis" button',
    crisis: 'Crisis mode: your reason, a letter from future you, witness notification and the Calm down section',
    guardians: 'Adding witnesses during setup',
    sudoku: 'Sudoku: four difficulty levels and a hint button',
  },
  how: {
    kicker: 'How it works', title: 'Four parts.<br>One system.',
    rows: [
      { no: '01', title: 'The contract', text: 'You write down what kind of gambling you are quitting, what sets you off and why you are quitting. You choose your timeframe and sign. If you want, you record your vow in a 60-second video.' },
      { no: '02', title: 'Witnesses', text: "One or two people you trust. They get an email invite and join QuitVow as witnesses; if you prefer, they never see what you're quitting. Not ready? Start without one, and a 7-day time lock guards the exit." },
      { no: '03', title: 'One cell a day', text: 'Your home screen fills up cell by cell over your quitting period. A daily check-in marks each day, so your progress is always in front of you.' },
      { no: '04', title: 'Two keys', text: "Leaving the contract early needs your witnesses' approval and a 72-hour wait. You can't give up with a single tap in the heat of an urge." },
    ],
  },
  crisis: {
    kicker: 'In a crisis', title: "When the urge hits,<br>you're not alone.",
    lead: 'Press "I\'m in crisis" and crisis mode opens, showing how an urge rises and falls like a wave.',
    ticks: [
      'Your own "why" and your letter from future you <span>come up first.</span>',
      'Your witnesses are emailed; <span>you can call them with one tap.</span>',
      'Calm down: pop balloons, sudoku, memory cards, tic-tac-toe, the 5-4-3-2-1 exercise.',
      'Helplines for your country <span>are always one tap away.</span>',
    ],
  },
  guardians: {
    kicker: 'Witnesses', title: 'No longer<br>a secret.',
    lead: 'Gambling usually grows in secrecy and shame. Your witnesses are there not to judge you, but to make the secret shareable.',
    ticks: [
      'Only template messages you have approved in advance are sent.',
      'Witnesses follow along in their own app screens and approve exit requests.',
      'Report it yourself and the consequences are softer: <span>honesty is rewarded.</span>',
    ],
  },
  science: {
    kicker: 'The science', title: 'Every step is<br>backed by research.',
    cards: [
      { title: 'Decide in advance', text: 'Our ability to decide well drops in the heat of an urge. That is why the rules are written while you are calm, and are not up for bargaining later.', src: 'Loewenstein, 1996 · precommitment' },
      { title: '"If–then" plans', text: 'Knowing your triggers makes concrete plans possible. These plans change behaviour more than simply saying "I will".', src: 'Gollwitzer, American Psychologist, 1999' },
      { title: 'Social support', text: 'In addiction treatment, social support stands out as one of the strongest factors linked to recovery.', src: 'Addiction treatment literature (general finding)' },
      { title: 'Urge surfing', text: 'An urge rises and falls like a wave. You learn to watch it without fighting it, and to shift your attention elsewhere.', src: 'Bowen &amp; Marlatt, Psychology of Addictive Behaviors, 2009' },
    ],
  },
  games: {
    kicker: 'Calm down', title: 'Play, but not<br>to win.',
    lead: 'The calming games are there to shift your attention. By design there are no random rewards, no chasing points and no "one more round" loops; nothing that resembles gambling mechanics.',
    ticks: [
      'Sudoku <span>· four levels from easy to extra hard, with hints</span>',
      'Pop balloons <span>· tap to pop, no rush</span>',
      'Memory cards, tic-tac-toe, 5-4-3-2-1, counting down by 7',
    ],
  },
  packs: {
    kicker: 'Packs', title: 'Try it first.<br>Then choose your time.', unit: 'days',
    plans: [
      { cls: ' free', days: '7', text: 'Free trial. Once per account.' },
      { cls: '', days: '30', text: 'Get through the first month. Detailed trigger analysis and a specialist report.' },
      { cls: '', days: '60', text: 'Pull the habit out by the roots. Analysis and report.' },
      { cls: '', days: '90', text: 'The most lasting path. Analysis and report.' },
    ],
    note: 'Prices will be announced at launch. Crisis mode, calming games, witness notifications and helplines are always free. Not a subscription; nothing renews automatically.',
  },
  privacy: {
    kicker: 'Privacy', title: "We don't watch you.<br>We don't hold money.",
    rows: [
      { no: '01', title: 'No bank connection', text: 'We don\'t track your spending. The "estimated saved" amount is based only on the estimate you enter.' },
      { no: '02', title: 'No real-money transactions', text: 'QuitVow takes no deposits, holds no money, and issues no refunds or penalties.' },
      { no: '03', title: 'Your notes and video stay on your phone', text: 'Your "why I\'m quitting" note, your letter to future you and your vow video are never sent to our servers. You can share the video with your witnesses yourself if you want.' },
      { no: '04', title: 'Deleted with one tap', text: 'You can permanently delete your account and your pact from inside the app.' },
    ],
  },
  footer: {
    kicker: 'Free helplines',
    privacy: 'Privacy', privacyHref: 'en/privacy/', terms: 'Terms', termsHref: 'en/terms/', blog: 'Blog', blogHref: 'blog/',
    lines: [
      { tel: '18004262537', name: '1-800-GAMBLER', sub: 'Gambling helpline · US', cls: '' },
      { tel: '08088020133', name: '0808 8020 133', sub: 'National Gambling Helpline · UK', cls: '' },
      { tel: '911', name: 'Emergency · 911', sub: 'US · if a life is in danger', cls: 'urgent' },
      { tel: '999', name: 'Emergency · 999', sub: 'UK · if a life is in danger', cls: 'urgent' },
    ],
    disclaimer: 'QuitVow is not a treatment and does not guarantee success. The best-supported approach for gambling disorder is cognitive behavioural therapy; we recommend getting professional support.',
  },
};

// English legal texts. Written from the server's real data flows; update together with the code.
export default (co) => ({
  back: '← Home',
  updatedLabel: 'Last updated',
  privacy: {
    path: 'privacy',
    title: 'Privacy Policy',
    body: `
<p>This policy explains how personal data is processed when you use the QuitVow mobile app and the quitvow.com.tr website. In short: <b>we never ask for bank or account details, we use no advertising or analytics tools, and your "why" note, your letter, your journal and your vow video stay only on your phone.</b></p>

<h2>1. Controller</h2>
<p>${co.legalName} (a limited liability company organised in New Mexico, USA)<br>${co.address}<br>Email: <a href="mailto:${co.email}">${co.email}</a></p>

<h2>2. Data that stays only on your phone</h2>
<p>The following is never sent to our servers. It is stored only on your device and is removed from it when you delete the app or your account:</p>
<ul>
<li>your "why I'm quitting" note and your letter to your future self,</li>
<li>your vow video (you share it yourself through your device's share menu, only if you choose to),</li>
<li>your journal entries (urge notes, triggers, who helped you that day), your risky times, and your theme and language preferences.</li>
</ul>
<p><b>Betting blocker (Android, optional):</b> If you turn on the blocker, the app uses Android's VPN framework to run an address filter inside your phone. Your internet traffic is not routed to any server. The addresses you try to open are compared with the gambling list only on your phone; they are not stored or sent to us. Address lookups that are not blocked go to your phone's own DNS server. Only the number of sites blocked today is kept on your phone. The block list and rules are downloaded from our server.</p>

<h2>3. Data processed on our servers</h2>
<ul>
<li><b>Account:</b> your email address, your name (optional) and your language. You sign in with a 6-digit code sent to your email; we keep no passwords.</li>
<li><b>Pact details:</b> the kind of habit you are quitting (e.g. "sports betting"), the pack length, start and clean-streak dates, and your choices to start without a witness or to hide what you are quitting from your witnesses.</li>
<li><b>Usage events:</b> when you check in and your optional urge score (0–10), when you press the crisis button, relapse dates you report yourself, early-exit requests and witness approvals, the time of the last signal showing the app is still installed, your device platform (Android/iOS) and, if you use it, whether the betting blocker is on or off.</li>
<li><b>Your witnesses:</b> the name and email address of each witness you add, and the status of their invite.</li>
<li><b>Record of emails sent:</b> recipient, subject and text of emails sent to you and your witnesses (for support and troubleshooting).</li>
<li><b>Purchases</b> (once packs go on sale): the pack bought and the Google Play order/verification details. Your card details stay with Google and never reach us.</li>
<li><b>Technical data:</b> your IP address is held briefly in memory to prevent abuse; our hosting provider may keep standard access logs.</li>
</ul>
<p>The kind of habit you are quitting and your urge scores may count as health-related data. We process them on the basis of the <b>explicit consent</b> you give in the last step of setup. You can withdraw it at any time by deleting your account.</p>

<h2>4. Purposes and legal bases</h2>
<ul>
<li>creating your account and running your pact calendar and two-key exit (performance of a contract),</li>
<li>emailing the witnesses you choose about invites, relapses, exit requests, a missing signal, the betting blocker being turned off and, if you opt in, weekly good news (consent and performance of a contract),</li>
<li>health-related data: explicit consent,</li>
<li>security, abuse prevention and legal obligations (legitimate interests and legal obligation).</li>
</ul>
<p>We do not use your data for advertising, profiling or sale, and we never sell it to anyone.</p>

<h2>5. About witnesses</h2>
<p>Before adding someone as a witness, it is your responsibility to tell them and get their agreement. The first email a witness receives says who invited them and why; they may ignore or decline it. Witnesses who decline or are removed receive no further emails. Witnesses have the same rights described here.</p>

<h2>6. Service providers</h2>
<p>We use the following processors to run the service. Some are outside Türkiye and the EU; transfers rely on the explicit consent you give during setup and on the providers' standard contractual safeguards.</p>
<ul>
<li><b>Supabase Inc.</b> (USA): database; data is stored in the EU, in Frankfurt, Germany.</li>
<li><b>Railway Corp.</b> (USA): hosting of the app server.</li>
<li><b>Resend</b> (USA): email delivery.</li>
<li><b>Google LLC</b>: app distribution and, once enabled, payments through Google Play.</li>
<li><b>Netlify Inc.</b> (USA): hosting of this website.</li>
</ul>
<p>We share your data with no one else unless the law requires it.</p>

<h2>7. Retention</h2>
<ul>
<li>Account, pact, witness and usage records: until you delete your account. Deleting it removes them immediately and permanently.</li>
<li>Record of emails sent to you: immediately when you delete your account, otherwise automatically after 90 days.</li>
<li>Record of emails sent to your witnesses: automatically after 90 days.</li>
<li>Sign-in codes: valid for 10 minutes and deleted when they expire.</li>
<li>Purchase records: for the legally required period (once packs go on sale).</li>
</ul>

<h2>8. Deleting your account and data</h2>
<p>In the app, go to <b>Profile → Delete my account and data</b> to delete your account and all your server data instantly; the data on your phone is deleted too. If you have an active pact, your witnesses are told it has closed. If you cannot access the app, email <a href="mailto:${co.email}">${co.email}</a> from the address linked to your account with the words "delete my account"; we will complete the request within 30 days.</p>

<h2>9. Security</h2>
<p>All connections are encrypted (HTTPS/TLS). Only our server can reach the database; invite codes and sign-in codes are stored only as hashes. The admin panel cannot see vow videos, "why" notes or letters; they are not on the server at all.</p>

<h2>10. Your rights</h2>
<p>You can ask whether we process your data, request access, correction or deletion, learn who it was shared with, object to processing, and seek compensation for damage. Depending on where you live (for example under KVKK in Türkiye or the GDPR in the EU/UK) you may also have rights to restriction and portability. Email <a href="mailto:${co.email}">${co.email}</a>; we reply within 30 days. You may also complain to your local data protection authority.</p>

<h2>11. Age limit</h2>
<p>QuitVow deals with gambling and is not intended for anyone under 18. We delete accounts we learn belong to someone under 18.</p>

<h2>12. Changes</h2>
<p>We may update this policy. For important changes we will let you know in the app or by email. The current version is always at this address.</p>
`,
  },
  terms: {
    path: 'terms',
    title: 'Terms of Use',
    body: `
<p>By downloading or using QuitVow you accept these terms. The service is provided by ${co.legalName} ("we").</p>

<h2>1. What QuitVow is and is not</h2>
<p>QuitVow is a commitment and tracking tool for people who want to quit gambling and betting: a contract, witnesses, a crisis mode and daily check-ins. <b>QuitVow is not a treatment, a medical device or a counselling service, and it does not guarantee success.</b> We recommend professional support for gambling disorder. If you are thinking about harming yourself or someone else, contact your local emergency number immediately.</p>

<h2>2. Who can use it</h2>
<p>You must be at least 18 to use QuitVow. Your account is personal; do not share your sign-in codes.</p>

<h2>3. Witnesses</h2>
<p>Only add witnesses who know about it and agree. You may not open an account for someone else, monitor someone without their knowledge, or use witness emails to harass anyone. Witnesses can decline or step back at any time.</p>

<h2>4. The rules are set in advance</h2>
<p>The rules you choose when you set up a pact (two-key exit, waiting periods, telling witnesses about relapses) apply for the whole pact. They exist to protect you in the moment of an urge: an early exit needs the waiting period and witness approval, or a 7-day waiting period in a pact without witnesses. You can always delete your account.</p>

<h2>5. Packs and payment</h2>
<p>The first 7-day trial is free and can be used once per account. Once 30, 60 and 90-day packs go on sale they are sold only through Google Play, at the prices shown in the store. Packs are not subscriptions and do not renew automatically. Refunds follow Google Play's refund policy. QuitVow handles no real-money transactions: it holds no deposits, charges no penalties, and pays out no refunds or rewards in money.</p>

<h2>6. Prohibited use</h2>
<p>You may not use the service for unlawful purposes, to harass others, to try to break its security, or to overload it with automated tools. If you do, we may suspend or delete your account.</p>

<h2>7. Availability</h2>
<p>We work to keep the service running, but maintenance, faults or third-party providers may cause interruptions. We cannot guarantee that emails reach your witnesses (for example, spam folders). We may change features, or end the service with reasonable notice.</p>

<h2>8. Limitation of liability</h2>
<p>The service is provided "as is". To the extent the law allows, we are not liable for indirect losses arising from using or being unable to use the service, including gambling losses. This does not affect liability that cannot be limited by law or your statutory rights as a consumer.</p>

<h2>9. Personal data</h2>
<p>How your data is processed is described in the <a href="../privacy/">Privacy Policy</a>.</p>

<h2>10. Governing law</h2>
<p>These terms are governed by the laws of the State of New Mexico, USA. This choice does not remove the mandatory consumer protections of the country where you live, including your right to bring a claim before the consumer bodies and courts there.</p>

<h2>11. Contact</h2>
<p><a href="mailto:${co.email}">${co.email}</a> · ${co.legalName}, ${co.address}</p>
`,
  },
});

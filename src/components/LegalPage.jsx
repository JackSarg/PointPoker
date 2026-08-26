import { ArrowLeft, ExternalLink } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const LAST_UPDATED = '26 August 2026'

function InternalLink({ href, onNavigate, children }) {
  return <a href={href} onClick={(event) => { event.preventDefault(); onNavigate(href) }}>{children}</a>
}

function PrivacyPolicy() {
  return (
    <>
      <p className="legal-lead">This notice explains the small amount of information PointPoker uses to run multiplayer planning-poker rooms.</p>

      <section>
        <h2>Who runs PointPoker</h2>
        <p>PointPoker is operated by Jack. You can get in touch privately through <a href="https://www.linkedin.com/in/jacksarg/" target="_blank" rel="noopener noreferrer">LinkedIn <ExternalLink size={13} /></a>. Do not include private room tokens or confidential ticket content in your message.</p>
      </section>

      <section>
        <h2>Information the service uses</h2>
        <ul>
          <li>Room names, nicknames, chosen characters, readiness, votes, confidence, reactions and scoring history.</li>
          <li>Optional story keys, titles, descriptions and acceptance criteria entered by the room host.</li>
          <li>Room access identifiers stored in your browser so your seat can reconnect.</li>
          <li>Technical request information, such as an IP address, processed transiently by Cloudflare to deliver, secure and rate-limit the service.</li>
        </ul>
        <p>Do not enter secrets, special-category personal data, customer records or confidential ticket content into a public room.</p>
      </section>

      <section>
        <h2>Purpose and lawful basis</h2>
        <p>The information is used only to create rooms, synchronise participants, keep votes private until reveal, calculate round results, prevent abuse and restore a participant's seat. The lawful basis is legitimate interests: operating a lightweight collaborative estimation service that users choose to join, with minimal privacy impact.</p>
      </section>

      <section>
        <h2>Sharing and international processing</h2>
        <p>Room information is shared with people who have the room link. Cloudflare provides hosting, storage, networking and security and may process data internationally under its contractual safeguards. PointPoker does not sell personal information and does not use advertising or behavioural analytics.</p>
      </section>

      <section>
        <h2>Retention</h2>
        <p>Room data is automatically deleted after seven days without room activity. If participants are still connected when expiry is due, deletion is postponed. Browser-held room access details, theme choice and recent emoji choices remain until you clear this site's browser data. Rate-limit counters are short-lived platform security data.</p>
      </section>

      <section>
        <h2>Browser storage</h2>
        <p>PointPoker does not set advertising or analytics cookies. It uses local browser storage for the room access key needed to reconnect, your colour theme and recent emoji choices. These are functional selections and are not used to follow you across websites.</p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Depending on the circumstances, UK data-protection law may give you rights to access, correct, erase, restrict or object to use of your personal information, and to complain to the Information Commissioner's Office. Contact Jack by private LinkedIn message with the room code and enough information to locate the relevant record. Never send your private room token.</p>
      </section>
    </>
  )
}

function TermsOfUse() {
  return (
    <>
      <p className="legal-lead">These simple terms are intended to keep PointPoker useful, safe and fair for everyone.</p>

      <section>
        <h2>Using the service</h2>
        <p>You may use PointPoker for lawful collaborative estimation. Do not disrupt the service, attempt unauthorised access, automate abusive room creation, impersonate others, or upload unlawful, harmful or confidential material you are not permitted to share.</p>
      </section>

      <section>
        <h2>Your content</h2>
        <p>You keep ownership of content you enter. You give PointPoker the limited permission needed to store it temporarily and show it to participants in your room. You are responsible for ensuring you have permission to share that content.</p>
      </section>

      <section>
        <h2>No accounts or permanent record</h2>
        <p>Rooms are link-accessible and participants use nicknames. Do not treat PointPoker as a permanent system of record or as a place to store sensitive information.</p>
      </section>

      <section>
        <h2>Availability and liability</h2>
        <p>The service is provided free of charge and on an as-available basis, without a service-level guarantee. To the extent permitted by law, Jack is not liable for indirect loss, lost data, missed estimates or decisions made using the service. Nothing in these terms excludes liability that cannot legally be excluded.</p>
      </section>

      <section>
        <h2>Third-party names</h2>
        <p>PointPoker is an independent project and is not affiliated with or endorsed by Atlassian. Jira is a trademark of Atlassian.</p>
      </section>

      <section>
        <h2>Changes and governing law</h2>
        <p>These terms may be updated when the service changes. English law applies and the courts of England and Wales have jurisdiction, subject to any mandatory consumer rights that apply where you live.</p>
      </section>
    </>
  )
}

export default function LegalPage({ kind, onNavigate, theme, onThemeChange }) {
  const isPrivacy = kind === 'privacy'
  return (
    <main className="legal-page">
      <header className="legal-header">
        <button className="back-link" type="button" onClick={() => onNavigate('/')}><ArrowLeft size={16} /> Back home</button>
        <Logo href="/" />
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </header>
      <article className="legal-card">
        <span className="mini-label">PointPoker legal</span>
        <h1>{isPrivacy ? 'Privacy notice' : 'Terms of use'}</h1>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>
        {isPrivacy ? <PrivacyPolicy /> : <TermsOfUse />}
        <nav className="legal-switch" aria-label="Legal pages">
          <InternalLink href="/privacy" onNavigate={onNavigate}>Privacy notice</InternalLink>
          <InternalLink href="/terms" onNavigate={onNavigate}>Terms of use</InternalLink>
        </nav>
      </article>
    </main>
  )
}

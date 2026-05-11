import Link from 'next/link'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen px-5 py-12" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Back</Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cookie Policy</h1>
          <p style={{ color: 'var(--text-tertiary)' }}>Last updated May 11, 2026</p>

          <p>This Cookie Policy explains how <strong style={{ color: 'var(--text-primary)' }}>StudyReady</strong> uses cookies and similar technologies when you visit <a href="https://studyready.org" className="underline" style={{ color: 'var(--accent)' }}>https://studyready.org</a>.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>What are cookies?</h2>
          <p>Cookies are small data files placed on your device when you visit a website. They help the website work properly and provide usage information. Cookies set by us are called "first-party cookies." Cookies set by others are called "third-party cookies."</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>Why do we use cookies?</h2>
          <p>We use cookies for the following reasons:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong style={{ color: 'var(--text-primary)' }}>Essential cookies</strong> — Required for the website to function. This includes Supabase authentication session cookies. These cannot be disabled.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Analytics cookies</strong> — Vercel Analytics collects anonymous usage data such as page views and performance metrics.</li>
          </ul>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>How can I control cookies?</h2>
          <p>You can control cookies through your browser settings. Note that disabling cookies may affect the functionality of the site (e.g. you may not be able to stay logged in).</p>
          <p>Manage cookies in your browser:</p>
          <ul className="list-disc pl-5 space-y-1">
            {[
              { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
              { name: 'Firefox', url: 'https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop' },
              { name: 'Safari', url: 'https://support.apple.com/en-ie/guide/safari/sfri11471/mac' },
              { name: 'Edge', url: 'https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd' },
            ].map(({ name, url }) => (
              <li key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>{name}</a>
              </li>
            ))}
          </ul>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>Do you serve targeted advertising?</h2>
          <p>No. We do not serve targeted advertising and do not use advertising cookies.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>How often will this policy be updated?</h2>
          <p>We may update this Cookie Policy from time to time. The date at the top indicates when it was last updated.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>Contact</h2>
          <p>Questions about our use of cookies? Email us at <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a>.</p>
        </div>

      </div>
    </div>
  )
}

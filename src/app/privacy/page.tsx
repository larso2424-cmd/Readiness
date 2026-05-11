import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-12" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Back</Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-tertiary)' }}>Last updated May 11, 2026</p>

          <p>This Privacy Notice for <strong style={{ color: 'var(--text-primary)' }}>StudyReady</strong> ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you visit our website at <a href="https://studyready.org" className="underline" style={{ color: 'var(--accent)' }}>https://studyready.org</a>.</p>

          <p><strong style={{ color: 'var(--text-primary)' }}>Questions or concerns?</strong> If you do not agree with our policies and practices, please do not use our Services. If you have questions, please contact us at <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a>.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>1. What Information Do We Collect?</h2>
          <p>We collect personal information that you voluntarily provide to us when you register on the Services. This includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email addresses</li>
            <li>Contact or authentication data</li>
          </ul>
          <p>We do not collect sensitive information.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Payment Data.</strong> All payment data is handled and stored by Stripe and Supabase. You may find their privacy notices at <a href="https://stripe.com/privacy" className="underline" style={{ color: 'var(--accent)' }}>stripe.com/privacy</a> and <a href="https://supabase.com/privacy" className="underline" style={{ color: 'var(--accent)' }}>supabase.com/privacy</a>.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Information automatically collected.</strong> We automatically collect certain information when you visit our Services, such as IP address, browser and device characteristics, and usage information. This is collected via Vercel Analytics.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>2. How Do We Process Your Information?</h2>
          <p>We process your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Facilitate account creation and authentication</li>
            <li>Deliver and facilitate delivery of services</li>
            <li>Respond to user inquiries and offer support</li>
            <li>Send administrative information</li>
            <li>Fulfill and manage your orders and payments</li>
          </ul>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>3. Legal Bases for Processing</h2>
          <p>We rely on the following legal bases under GDPR: consent, performance of a contract, legal obligations, and vital interests.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>4. When and With Whom Do We Share Your Information?</h2>
          <p>We share your personal information with the following third parties:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong style={{ color: 'var(--text-primary)' }}>Anthropic</strong> — AI content generation</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Stripe</strong> — invoicing and billing</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Supabase</strong> — infrastructure and data storage</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Vercel</strong> — website hosting and analytics</li>
          </ul>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>5. Artificial Intelligence</h2>
          <p>We use Anthropic's Claude to generate math practice questions. Your use of the AI features is subject to Anthropic's terms and policies.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>6. International Transfers</h2>
          <p>Our servers are located in the United States. If you are in the EEA or UK, your data may be transferred internationally. We rely on the European Commission's Standard Contractual Clauses for such transfers.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>7. How Long Do We Keep Your Information?</h2>
          <p>We keep your personal information for as long as you have an account with us. When you delete your account, we will delete or anonymize your information.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>8. How Do We Keep Your Information Safe?</h2>
          <p>We have implemented appropriate technical and organizational security measures. However, no electronic transmission over the Internet can be guaranteed to be 100% secure.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>9. Your Privacy Rights</h2>
          <p>If you are located in the EEA, UK, or Switzerland, you have the right to access, rectify, erase, or restrict processing of your personal information. To exercise these rights, contact us at <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a>.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>10. Do-Not-Track Features</h2>
          <p>We do not currently respond to DNT browser signals.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>11. Updates to This Notice</h2>
          <p>We may update this Privacy Notice from time to time. We will notify you of any material changes.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>12. Contact Us</h2>
          <p>If you have questions about this Privacy Notice, contact us at:</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>StudyReady</strong><br />
          <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a></p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>13. Review, Update, or Delete Your Data</h2>
          <p>To request access to, correction of, or deletion of your personal information, email us at <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a>.</p>
        </div>

      </div>
    </div>
  )
}

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-12" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-8">

        <div>
          <Link href="/" className="text-sm transition-colors" style={{ color: 'var(--text-tertiary)' }}>← Back</Link>
        </div>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Terms of Use</h1>
          <p style={{ color: 'var(--text-tertiary)' }}>Last updated May 11, 2026</p>

          <p>These Terms of Use constitute a legally binding agreement between you and <strong style={{ color: 'var(--text-primary)' }}>StudyReady</strong> ("we," "us," or "our") governing your access to and use of our services at <a href="https://studyready.org" className="underline" style={{ color: 'var(--accent)' }}>https://studyready.org</a>. By accessing the Services, you agree to be bound by these Terms. If you do not agree, please discontinue use immediately.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>1. Our Services</h2>
          <p>StudyReady is an IB Math study tool that helps students identify weak topics and practice with AI-generated questions before their exam. The information provided is not intended for distribution in any jurisdiction where such distribution would be contrary to law or regulation.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>2. Intellectual Property Rights</h2>
          <p>We own or license all intellectual property rights in our Services, including source code, databases, software, designs, audio, video, text, and graphics (the "Content"). The Content is provided for your personal, non-commercial use only. You may not reproduce, distribute, or exploit any Content without our prior written permission.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>3. User Representations</h2>
          <p>By using the Services, you represent that: (1) you have the legal capacity to agree to these Terms; (2) you are not a minor in your jurisdiction; (3) you will not access the Services through automated means; and (4) your use will not violate any applicable law or regulation.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>4. Prohibited Activities</h2>
          <p>You may not use the Services for any purpose other than that for which we make them available. Prohibited activities include but are not limited to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Systematically retrieving data to create collections or databases without permission</li>
            <li>Deceiving or misleading us or other users</li>
            <li>Circumventing security features of the Services</li>
            <li>Using the Services to send unsolicited communications</li>
            <li>Using any automated tools, bots, or scrapers</li>
            <li>Attempting to impersonate another user or person</li>
            <li>Using the Services in any unlawful manner</li>
          </ul>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>5. Services Management</h2>
          <p>We reserve the right to monitor the Services for violations of these Terms, take appropriate legal action, and manage the Services in a way designed to protect our rights and property.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>6. Term and Termination</h2>
          <p>These Terms remain in full force while you use the Services. We reserve the right to deny access or terminate your use at our sole discretion, without notice or liability. If your account is terminated, these Terms remain in effect.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>7. Modifications and Interruptions</h2>
          <p>We reserve the right to change, modify, or remove content from the Services at any time. We are not liable for any modification, suspension, or discontinuation of the Services.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>8. Governing Law</h2>
          <p>These Terms are governed by the laws of <strong style={{ color: 'var(--text-primary)' }}>Germany</strong>. Any disputes shall be resolved in the courts of Germany.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>9. Dispute Resolution</h2>
          <p><strong style={{ color: 'var(--text-primary)' }}>Informal Negotiations.</strong> Before initiating arbitration, parties must first attempt to resolve any dispute through informal negotiations for at least 30 days.</p>
          <p className="mt-2"><strong style={{ color: 'var(--text-primary)' }}>Binding Arbitration.</strong> If informal negotiations fail, disputes shall be referred to and finally resolved by the International Chamber of Commerce under its arbitration rules. Arbitration will take place in Munich, Germany. The language of proceedings shall be English.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>10. Disclaimer</h2>
          <p>The Services are provided on an as-is and as-available basis. We disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. We make no guarantees about the accuracy or completeness of any content on the Services.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>11. Limitations of Liability</h2>
          <p>To the fullest extent permitted by law, we shall not be liable for any indirect, consequential, exemplary, incidental, special, or punitive damages. Our total liability to you for any cause shall be limited to the amount paid by you to us in the six (6) months prior to the claim.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>12. Indemnification</h2>
          <p>You agree to defend, indemnify, and hold us harmless from any claims, liabilities, damages, or expenses arising from your use of the Services or your breach of these Terms.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>13. User Data</h2>
          <p>We maintain certain data that you transmit to the Services. You are solely responsible for data you transmit. Please review our <Link href="/privacy" className="underline" style={{ color: 'var(--accent)' }}>Privacy Policy</Link> for details on how we handle your data.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>14. Miscellaneous</h2>
          <p>These Terms constitute the entire agreement between you and us. If any provision is found to be unenforceable, the remaining provisions will continue in full force. Our failure to enforce any right or provision shall not constitute a waiver of that right.</p>

          <h2 className="text-lg font-semibold pt-4" style={{ color: 'var(--text-primary)' }}>15. Contact Us</h2>
          <p>For questions or complaints regarding the Services, contact us at:</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>StudyReady</strong><br />
          <a href="mailto:peters.o.lars@icloud.com" className="underline" style={{ color: 'var(--accent)' }}>peters.o.lars@icloud.com</a></p>
        </div>

      </div>
    </div>
  )
}

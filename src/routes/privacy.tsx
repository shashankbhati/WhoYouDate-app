import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — WhoAmIDating" },
      { name: "description", content: "How WhoAmIDating collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Back to home</Link>

      <h1 className="text-3xl font-bold mt-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Effective date: 13 June 2026 · Operator: WhoAmIDating (<span className="text-foreground">whoamidating.singles</span>)
      </p>

      <Section title="1. What we collect">
        <p>WhoAmIDating is built around anonymity. Here is exactly what we store:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>An anonymous user ID generated automatically on first visit (no name, no email required to browse)</li>
          <li>Dating entries you log: activity type, amount spent, currency, partner nickname (no real names allowed), mood rating, city, and date</li>
          <li>Community posts and comments you write</li>
          <li>A display profile you optionally set: username, age range, city, country, relationship stage</li>
          <li>Your email address if you choose to sign in (used only for authentication, never shown publicly)</li>
        </ul>
      </Section>

      <Section title="2. What we do NOT collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>Real names of you or your dates</li>
          <li>Phone numbers</li>
          <li>Device identifiers or advertising IDs</li>
          <li>Location beyond the city you manually enter</li>
          <li>Any third-party tracking or analytics cookies</li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <p>Your data is used solely to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Display community dating statistics and trends on the platform</li>
          <li>Power your personal profile, badge system, and date log</li>
          <li>Maintain your authenticated session so your data persists across visits</li>
        </ul>
        <p className="mt-2">We do not sell, rent, or share your data with any third party for marketing purposes.</p>
      </Section>

      <Section title="4. Cookies and local storage">
        <p>
          We use a single functional authentication cookie set by Supabase to keep you signed in.
          This cookie is strictly necessary for the service to function and does not track you
          across other websites. No advertising or analytics cookies are used.
        </p>
      </Section>

      <Section title="5. Data storage and security">
        <p>
          Your data is stored in Supabase (supabase.com), hosted in the EU (Frankfurt, Germany).
          All data is transmitted over HTTPS. Row-level security policies ensure users can only
          access their own private data.
        </p>
      </Section>

      <Section title="6. Your rights (GDPR)">
        <p>If you are in the European Economic Area, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong className="text-foreground">Access</strong> — request a copy of your data</li>
          <li><strong className="text-foreground">Deletion</strong> — request deletion of your account and all associated data</li>
          <li><strong className="text-foreground">Portability</strong> — receive your data in a machine-readable format</li>
          <li><strong className="text-foreground">Correction</strong> — update or correct your stored information</li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, email{" "}
          <a href="mailto:privacy@whoamidating.singles" className="text-primary hover:underline">
            privacy@whoamidating.singles
          </a>
          . We will respond within 30 days.
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>
          Your data is retained for as long as your account is active. If you request account
          deletion, all your entries, posts, comments, and profile data will be permanently
          deleted within 7 days.
        </p>
      </Section>

      <Section title="8. Age requirement">
        <p>
          WhoAmIDating is intended for users aged 18 and over. By using the service you confirm
          you are at least 18 years old. We do not knowingly collect data from minors.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          If we make material changes to this policy we will update the effective date above.
          Continued use of the service after changes constitutes acceptance of the updated policy.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Questions or concerns? Email us at{" "}
          <a href="mailto:privacy@whoamidating.singles" className="text-primary hover:underline">
            privacy@whoamidating.singles
          </a>
          .
        </p>
      </Section>

      <div className="mt-12 pt-6 border-t border-border">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Back to home</Link>
      </div>
    </main>
  );
}

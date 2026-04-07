import Link from 'next/link'
import { ArrowRight, Sparkles, Trophy, Users } from 'lucide-react'
import { AuthButton } from '@/components/AuthButton'

export default function AuthPage() {
  return (
    <main className="page-shell grid-bg">
      <div className="container">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="card-strong flex min-h-[640px] flex-col justify-between p-6 md:p-8">
            <div>
              <div className="pill mb-5">
                <Sparkles size={14} />
                <span>Private beta</span>
              </div>

              <h1 className="section-title max-w-2xl text-white">
                Taste has always been social. Now it’s structured.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
                The Pulse helps you rank the brands you actually use, compare taste with friends,
                unlock badges, and discover what to try next — starting with coffee.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="card p-4">
                <Trophy className="mb-3 text-accent" size={18} />
                <p className="text-sm font-semibold text-white">Leaderboards</p>
                <p className="mt-1 text-sm text-muted">See who’s ranking, discovering, and influencing first.</p>
              </div>

              <div className="card p-4">
                <Users className="mb-3 text-accent" size={18} />
                <p className="text-sm font-semibold text-white">Friends</p>
                <p className="mt-1 text-sm text-muted">Compare shelves privately before the public graph opens up.</p>
              </div>

              <div className="card p-4">
                <Sparkles className="mb-3 text-accent" size={18} />
                <p className="text-sm font-semibold text-white">Badges</p>
                <p className="mt-1 text-sm text-muted">Earn identity, not just points — Early Bird, Pioneer, Explorer.</p>
              </div>
            </div>
          </section>

          <section className="card flex min-h-[640px] flex-col justify-center p-6 md:p-8">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8">
                <p className="text-sm uppercase tracking-[0.18em] text-faint">Welcome</p>
                <h2 className="heading-md mt-2 text-white">Create your taste profile</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Sign in with Google to start ranking brands, saving your shelf, and unlocking
                  category-specific recommendations.
                </p>
              </div>

              <div className="space-y-4">
                <AuthButton mode="signup" />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-muted">
                    Your sign-in unlocks:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-white">
                    <li>• Personal shelf saved to your account</li>
                    <li>• Cross-device sync</li>
                    <li>• Private leaderboard identity</li>
                    <li>• Map discovery and saved cafés</li>
                  </ul>
                </div>

                <Link
                  href="/"
                  className="cta-secondary w-full justify-center"
                >
                  Explore preview
                  <ArrowRight size={16} />
                </Link>
              </div>

              <p className="mt-6 text-xs leading-5 text-faint">
                By continuing, you agree to the beta terms and allow The Pulse to create your
                profile using your Google name and avatar.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

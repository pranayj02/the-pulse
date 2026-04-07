import { CategoryPill } from '@/components/CategoryPill'
import { Header } from '@/components/Header'
import { SEED_CATEGORIES, SEED_COFFEE_BRANDS } from '@/lib/constants'

export default function OnboardingPage() {
  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.18em] text-faint">Onboarding</p>
          <h1 className="section-title mt-2 text-white">Set your starting taste graph</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Choose your first category, then mark the brands you’ve already tried. This helps us
            generate better face-offs from the very first session.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="card p-5 md:p-6">
            <div className="mb-5">
              <h2 className="heading-md text-white">1. Pick a category</h2>
              <p className="mt-2 text-sm text-muted">
                Coffee is live first, but the system is built to scale across categories.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {SEED_CATEGORIES.map((category) => (
                <CategoryPill
                  key={category.slug}
                  emoji={category.emoji}
                  label={category.name}
                  active={category.slug === 'coffee'}
                />
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-sm font-semibold text-white">Why this matters</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Categories stay isolated at the ranking layer, so later we can add tea, skincare,
                supplements, or chocolate without rebuilding the app architecture.
              </p>
            </div>
          </section>

          <section className="card-strong p-5 md:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="heading-md text-white">2. Pick brands you’ve tried</h2>
                <p className="mt-2 text-sm text-muted">
                  Choose at least 5. The more you select, the faster your shelf becomes useful.
                </p>
              </div>

              <div className="pill">
                <span>Min 5</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SEED_COFFEE_BRANDS.map((brand, index) => (
                <button
                  key={brand.name}
                  className={`rounded-2xl border p-4 text-left transition ${
                    index < 6
                      ? 'border-accent bg-accent/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold text-white">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <p className="font-semibold text-white">{brand.name}</p>
                  <p className="mt-1 text-sm text-muted">{brand.tagline}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="cta-primary">Continue to profile setup</button>
              <button className="cta-secondary">Import more later</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

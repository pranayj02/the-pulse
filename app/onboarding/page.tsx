'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Header } from '@/components/Header'
import { CategoryPill } from '@/components/CategoryPill'
import { SEED_CATEGORIES, SEED_COFFEE_BRANDS } from '@/lib/constants'

export default function OnboardingPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('coffee')
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    SEED_COFFEE_BRANDS.slice(0, 5).map((brand) =>
      brand.name.toLowerCase().replace(/\s+/g, '-')
    )
  )
  const [city, setCity] = useState('Mumbai')
  const [saving, setSaving] = useState(false)

  const coffeeBrandOptions = useMemo(
    () =>
      SEED_COFFEE_BRANDS.map((brand) => ({
        id: brand.name.toLowerCase().replace(/\s+/g, '-'),
        name: brand.name,
        tagline: brand.tagline,
      })),
    []
  )

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    )
  }

  const handleSubmit = async () => {
    if (selectedBrands.length < 5) {
      toast.error('Please choose at least 5 brands.')
      return
    }

    try {
      setSaving(true)

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categorySlug: selectedCategory,
          selectedBrandIds: selectedBrands,
          city,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not save onboarding.')
      }

      toast.success('Onboarding saved.')
      router.push('/')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not save onboarding.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="page-shell bottom-nav-space">
      <Header />

      <div className="container">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="card-strong p-6 md:p-8">
            <div className="mb-6">
              <div className="pill mb-4">
                <span>Step 1 of 2</span>
              </div>
              <h1 className="section-title text-white">Choose your first category</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted">
                Coffee is your pilot, but the product is designed to scale across categories.
                Your taste graph starts here.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {SEED_CATEGORIES.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setSelectedCategory(category.slug)}
                  className="text-left"
                >
                  <CategoryPill
                    emoji={category.emoji}
                    label={category.name}
                    active={selectedCategory === category.slug}
                  />
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-faint">Why category-first?</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
                <li className="flex gap-3">
                  <Check size={16} className="mt-1 shrink-0 text-accent" />
                  <span>Leaderboards, shelves, and discovery all stay scoped and interpretable.</span>
                </li>
                <li className="flex gap-3">
                  <Check size={16} className="mt-1 shrink-0 text-accent" />
                  <span>You can add skincare, tea, supplements, and more later without redesigning the app.</span>
                </li>
                <li className="flex gap-3">
                  <Check size={16} className="mt-1 shrink-0 text-accent" />
                  <span>Every comparison becomes cleaner because users stay in one taste context at a time.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-white">Your city</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
                placeholder="Mumbai"
              />
            </div>
          </section>

          <section className="card p-6 md:p-8">
            <div className="mb-6">
              <div className="pill mb-4">
                <span>Step 2 of 2</span>
              </div>
              <h2 className="heading-md text-white">Pick brands you’ve actually tried</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Select at least 5. These seed your first face-offs and help us build your starting shelf.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coffeeBrandOptions.map((brand) => {
                const isSelected = selectedBrands.includes(brand.id)

                return (
                  <label
                    key={brand.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      isSelected
                        ? 'border-accent/30 bg-accent/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleBrand(brand.id)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--color-accent)]"
                    />
                    <div>
                      <p className="font-semibold text-white">{brand.name}</p>
                      <p className="mt-1 text-sm leading-5 text-muted">{brand.tagline}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {selectedBrands.length} selected · You can edit this later from your profile
              </p>

              <div className="flex gap-3">
                <Link href="/" className="cta-secondary">
                  Skip for now
                </Link>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="cta-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Finish onboarding</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

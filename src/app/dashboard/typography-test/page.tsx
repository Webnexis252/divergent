"use client";

export default function TypographyTestPage() {
  return (
    <div className="bg-[#f7f6f6] min-h-screen p-10 font-sans text-black">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="border-b pb-6">
          <h1 className="text-display-2xl">Design System: Typography</h1>
          <p className="text-body-lg text-gray-600 mt-2">Standardized typography scale for the dashboard refinement.</p>
        </header>

        {/* Display Scale */}
        <section className="space-y-6">
          <h2 className="text-display-md text-primary-dark-blue border-l-4 border-primary-blue pl-4">Display Scale</h2>
          <div className="space-y-8 bg-white p-8 rounded-2xl shadow-card">
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Display 3xl (3.5rem / 56px)</p>
              <h1 className="text-display-3xl">The quick brown fox</h1>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Display 2xl (2.75rem / 44px)</p>
              <h1 className="text-display-2xl">The quick brown fox jumps</h1>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Display xl (2.25rem / 36px)</p>
              <h1 className="text-display-xl">The quick brown fox jumps over</h1>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Display lg (1.875rem / 30px)</p>
              <h1 className="text-display-lg">The quick brown fox jumps over the lazy</h1>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Display (1.5rem / 24px)</p>
              <h1 className="text-display">The quick brown fox jumps over the lazy dog</h1>
            </div>
          </div>
        </section>

        {/* Body Scale */}
        <section className="space-y-6">
          <h2 className="text-display-md text-primary-dark-blue border-l-4 border-primary-blue pl-4">Body Scale</h2>
          <div className="space-y-8 bg-white p-8 rounded-2xl shadow-card">
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Body xl (1.25rem / 20px)</p>
              <p className="text-body-xl">The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Body lg (1.125rem / 18px)</p>
              <p className="text-body-lg">The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Body (1rem / 16px)</p>
              <p className="text-body">The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Body sm (0.875rem / 14px)</p>
              <p className="text-body-sm">The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Body xs (0.75rem / 12px)</p>
              <p className="text-body-xs">The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
            <div>
              <p className="text-caption text-gray-400 mb-1 tracking-wider uppercase">Caption (0.6875rem / 11px)</p>
              <p className="text-caption">THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG</p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-6">
          <h2 className="text-display-md text-primary-dark-blue border-l-4 border-primary-blue pl-4">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-8 rounded-2xl shadow-card">
            <div className="space-y-2">
              <div className="h-16 w-full bg-primary-blue rounded-lg shadow-sm"></div>
              <p className="text-body-xs font-semibold">Primary Blue (#38c1ff)</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 w-full bg-primary-dark-blue rounded-lg shadow-sm"></div>
              <p className="text-body-xs font-semibold">Dark Blue (#1b77ff)</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 w-full bg-accent-gold rounded-lg shadow-sm"></div>
              <p className="text-body-xs font-semibold">Accent Gold (#fec600)</p>
            </div>
            <div className="space-y-2">
              <div className="h-16 w-full bg-accent-yellow rounded-lg shadow-sm"></div>
              <p className="text-body-xs font-semibold">Accent Yellow (#ffc107)</p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="space-y-6">
          <h2 className="text-display-md text-primary-dark-blue border-l-4 border-primary-blue pl-4">Interactive Components</h2>
          <div className="flex flex-wrap gap-6 items-center bg-white p-8 rounded-2xl shadow-card">
            <button className="btn-primary">Primary Action</button>
            <button className="btn-secondary">Secondary Action</button>
            <div className="w-full max-w-sm card-base card-hover">
              <h3 className="text-display mb-2">Card Component</h3>
              <p className="text-body-sm text-gray-500">This card uses the .card-base and .card-hover utility classes from our design system.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

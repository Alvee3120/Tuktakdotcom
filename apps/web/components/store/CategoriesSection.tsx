import { Headphones, Laptop, Smartphone, Watch } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

const categories = [
  {
    name: 'Phones',
    slug: 'phones',
    icon: Smartphone,
    count: 120,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    name: 'Laptops',
    slug: 'laptops',
    icon: Laptop,
    count: 85,
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    name: 'Audio',
    slug: 'audio',
    icon: Headphones,
    count: 200,
    color: 'bg-green-500/10 text-green-500',
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    icon: Watch,
    count: 350,
    color: 'bg-orange-500/10 text-orange-500',
  },
];

export function CategoriesSection() {
  return (
    <section className="section-padding bg-background">
      <div className="mx-auto max-w-screen-2xl px-2 sm:px-3 lg:px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-heading-lg text-foreground">Shop by Category</h2>
            <p className="text-body-sm text-muted-foreground mt-1">
              Find exactly what you&apos;re looking for
            </p>
          </div>
          <Link
            href="/products"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className={cn(
                'border-border bg-card group flex flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-300',
                'hover:border-primary/20 hover:shadow-md'
              )}
            >
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-xl',
                  category.color
                )}
              >
                <category.icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <h3 className="text-foreground text-sm font-semibold">{category.name}</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">{category.count}+ Products</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

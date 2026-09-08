'use client';

import { Calendar, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Container, Section } from '@/components/shared/Layout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  author: string;
  tags: string | null;
  publishedAt: string | null;
};

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blogs')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setPosts(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Section>
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h1 className="text-heading-xl font-bold">Blog</h1>
          <p className="text-body-md text-muted-foreground mt-2">
            Latest updates, reviews, and tech news
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-muted-foreground text-sm font-medium">No posts yet</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="border-border bg-card group flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="bg-muted relative aspect-[16/9] overflow-hidden">
                  {post.image ? (
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-muted-foreground/30 flex h-full items-center justify-center">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {post.tags && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {post.tags
                        .split(',')
                        .slice(0, 2)
                        .map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[9px]">
                            {tag.trim()}
                          </Badge>
                        ))}
                    </div>
                  )}
                  <h2 className="group-hover:text-primary line-clamp-2 text-sm font-semibold transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-auto flex items-center justify-between pt-4 text-xs">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}

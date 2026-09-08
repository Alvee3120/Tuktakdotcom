'use client';

import { ArrowLeft, Calendar, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Container, Section } from '@/components/shared/Layout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image: string | null;
  author: string;
  tags: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blogs/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (d.success) setPost(d.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <Section>
      <Container size="md">
        <Link
          href="/blog"
          className="text-muted-foreground hover:text-primary mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Blog
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-32" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-muted-foreground text-sm font-medium">Post not found</p>
            <Link href="/blog" className="text-primary mt-3 text-sm hover:underline">
              View all posts
            </Link>
          </div>
        ) : post ? (
          <article className="space-y-8">
            {post.image && (
              <div className="bg-muted relative aspect-[21/9] overflow-hidden rounded-2xl">
                <Image src={post.image} alt={post.title} fill className="object-cover" priority />
              </div>
            )}

            <div className="space-y-4">
              {post.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.split(',').map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}
              <h1 className="text-heading-lg font-bold">{post.title}</h1>
              <div className="text-muted-foreground flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {post.author}
                </span>
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              {post.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </article>
        ) : null}
      </Container>
    </Section>
  );
}

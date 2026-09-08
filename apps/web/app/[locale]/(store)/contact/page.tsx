'use client';

import { Mail, MapPin, Phone, Clock, Send, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { Container, Section } from '@/components/shared/Layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';

export default function ContactPage() {
  const t = useTranslations('contact');
  const tFaq = useTranslations('faq');
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setIsSuccess(true);
      toast.success(t('success'), { description: t('successDesc') });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setIsSuccess(false), 5000);
    } catch {
      toast.error(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  const infoCards = [
    { icon: MapPin, label: t('address'), value: t('addressValue') },
    { icon: Phone, label: t('phone'), value: t('phoneValue') },
    { icon: Mail, label: t('emailLabel'), value: t('emailValue') },
    { icon: Clock, label: t('hours'), value: t('hoursValue') },
  ];

  const faqItems = Array.from({ length: 6 }, (_, i) => ({
    question: tFaq(`q${i + 1}` as 'q1'),
    answer: tFaq(`a${i + 1}` as 'a1'),
  }));

  return (
    <>
      <Section>
        <Container>
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-heading-xl font-bold">{t('title')}</h1>
            <p className="text-body-md text-muted-foreground mt-3">{t('subtitle')}</p>
          </div>

          {/* Info Cards */}
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            {infoCards.map((card) => (
              <div
                key={card.label}
                className="border-border bg-card flex flex-col items-center rounded-xl border p-5 text-center"
              >
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  <card.icon className="text-primary h-5 w-5" />
                </div>
                <p className="text-body-xs text-muted-foreground mt-3 font-medium">{card.label}</p>
                <p className="text-body-sm mt-1 w-full break-words font-medium">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Form + Map */}
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">{t('name')}</Label>
                  <Input
                    id="contact-name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">{t('email')}</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-subject">{t('subject')}</Label>
                <Input
                  id="contact-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-message">{t('message')}</Label>
                <textarea
                  id="contact-message"
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  placeholder={t('messagePlaceholder')}
                  required
                  className="border-border bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
              </div>

              <PremiumButton
                variant="primary"
                size="lg"
                type="submit"
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Send className="h-4 w-4 animate-pulse" />
                    {t('sending')}
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {t('success')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t('send')}
                  </>
                )}
              </PremiumButton>
            </form>

            {/* Map Placeholder */}
            <div className="flex flex-col">
              <h3 className="text-heading-sm mb-3 font-semibold">{t('mapTitle')}</h3>
              <div className="border-border bg-muted relative flex-1 overflow-hidden rounded-xl border">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="text-primary/50 mx-auto h-8 w-8" />
                    <p className="text-body-sm text-muted-foreground mt-2">{t('addressValue')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* FAQ Section */}
      <Section className="bg-muted/30">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="text-heading-lg mb-8 text-center font-bold">{tFaq('title')}</h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-border bg-card rounded-lg border px-4"
                >
                  <AccordionTrigger className="text-body-md font-medium hover:no-underline">
                    <span className="flex items-center gap-2 text-left">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-body-sm text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Container>
      </Section>
    </>
  );
}

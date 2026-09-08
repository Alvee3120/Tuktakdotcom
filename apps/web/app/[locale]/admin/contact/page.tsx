'use client';

import { Mail, MessageSquare, Search, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { TabFilter } from '@/components/dashboard/TabFilter';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAdminContactMessages, useMarkMessageRead, useDeleteMessage } from '@/hooks/useAdmin';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export default function AdminContactPage() {
  const { data, isLoading } = useAdminContactMessages();
  const markRead = useMarkMessageRead();
  const deleteMsg = useDeleteMessage();
  const messages = data?.data ?? [];

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<(typeof messages)[0] | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');

  const openMessage = async (msg: (typeof messages)[0]) => {
    setSelected(msg);
    setReplyText('');
    if (!msg.isRead) {
      await markRead.mutateAsync(msg.id);
    }
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/api/admin/contact-messages/${selected.id}/reply`,
        { reply: replyText }
      );
      toast.success(res.message || 'Reply sent');
      setSelected((prev) => (prev ? { ...prev, repliedAt: new Date().toISOString() } : null));
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    await deleteMsg.mutateAsync(id);
    if (selected?.id === id) setSelected(null);
    toast.success('Message deleted');
  };

  const filtered = search
    ? messages.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()) ||
          m.message.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      {/* Tabs: Contact Messages vs Live Chat */}
      <div className="border-border border-b px-4 py-3">
        <TabFilter
          tabs={[
            { label: 'Contact Messages', value: 'contact', count: unread || undefined },
            { label: 'Live Chat', value: 'chat' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {activeTab === 'contact' ? (
        <div className="flex min-h-0 flex-1 gap-0">
          {/* Left: List */}
          <div
            className={cn(
              'border-border flex flex-col border-r',
              selected ? 'w-[380px]' : 'flex-1'
            )}
          >
            <div className="border-border space-y-3 border-b px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-heading-sm font-bold">Messages</h1>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {unread > 0 ? `${unread} unread` : 'All caught up'}
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search messages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-20 text-center">
                  <Mail className="text-muted-foreground/30 h-10 w-10" />
                  <p className="text-muted-foreground mt-3 text-sm font-medium">No messages</p>
                </div>
              ) : (
                <div className="space-y-1.5 p-3">
                  {filtered.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => openMessage(msg)}
                      className={cn(
                        'flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors',
                        selected?.id === msg.id
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                        !msg.isRead && 'border-l-primary border-l-[3px]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className={cn('text-sm', !msg.isRead && 'font-semibold')}>{msg.name}</p>
                        <div className="flex items-center gap-1.5">
                          {msg.repliedAt && (
                            <Badge variant="outline" className="text-[9px]">
                              Replied
                            </Badge>
                          )}
                          <span className="text-muted-foreground text-[10px]">
                            {new Date(msg.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {msg.subject || msg.message.slice(0, 60)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Detail */}
          <div className={cn('flex-1 overflow-y-auto', !selected && 'hidden lg:flex')}>
            {!selected ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-xs text-center">
                  <MessageSquare className="text-muted-foreground/30 mx-auto h-12 w-12" />
                  <p className="text-foreground mt-3 text-sm font-medium">Select a message</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Choose a message to read and reply
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{selected.subject || '(No subject)'}</h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Badge
                      variant={
                        selected.repliedAt ? 'default' : selected.isRead ? 'secondary' : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {selected.repliedAt ? 'Replied' : selected.isRead ? 'Read' : 'New'}
                    </Badge>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex h-7 w-7 items-center justify-center rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sender info */}
                <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-4">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
                    {selected.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selected.name}</p>
                    <a
                      href={`mailto:${selected.email}`}
                      className="text-primary text-xs hover:underline"
                    >
                      {selected.email}
                    </a>
                  </div>
                </div>

                {/* Message */}
                <div className="border-border bg-card rounded-xl border p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.message}</p>
                </div>

                {/* Reply */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Reply via Email
                  </Label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={5}
                    placeholder="Write your reply..."
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs">
                      Reply will be sent to: <span className="font-medium">{selected.email}</span>
                    </p>
                    <PremiumButton
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                      onClick={handleReply}
                      disabled={sending || !replyText.trim()}
                    >
                      {sending ? 'Sending...' : 'Send Reply'}
                    </PremiumButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            <MessageSquare className="h-7 w-7" />
          </div>
          <p className="text-foreground mt-4 text-sm font-semibold">Live chat is not set up yet</p>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            Real-time customer chat is not connected to a backend yet. Once enabled, live
            conversations will appear here in this tab, separate from contact form messages.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { Edit3, Plus, MapPin, Trash2, Loader2, Home, Briefcase, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { DashboardErrorBoundary } from '@/components/account/ErrorBoundary';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
} from '@/hooks/useOrders';
import { cn } from '@/lib/utils';

type FormState = {
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  postalCode: string;
  label: string;
  isDefault: boolean;
};
const emptyForm: FormState = {
  name: '',
  phone: '',
  street: '',
  city: '',
  district: '',
  postalCode: '',
  label: 'Home',
  isDefault: false,
};
const labelIcons: Record<string, typeof Home> = { Home, Office: Briefcase, Other: MapPin };

function AddressSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="border-border bg-card space-y-2.5 rounded-xl border p-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function AddressesPage() {
  const t = useTranslations('account');
  const { data: addressesRes, isLoading } = useAddresses();
  const addresses = addressesRes?.data ?? [];
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEdit = (addr: (typeof addresses)[number]) => {
    setEditingId(addr.id);
    setForm({
      name: addr.name,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      district: addr.district ?? '',
      postalCode: addr.postalCode ?? '',
      label: addr.label,
      isDefault: addr.isDefault,
    });
    setShowForm(true);
  };
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAddress.mutateAsync({ id: editingId, data: form });
        toast.success(t('addressUpdated'));
      } else {
        await createAddress.mutateAsync(form);
        toast.success(t('addressAdded'));
      }
      resetForm();
    } catch {
      toast.error(t('failedToSaveAddress'));
    }
  };
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAddress.mutateAsync(deleteId);
      toast.success(t('addressDeleted'));
    } catch {
      toast.error(t('failedToDeleteAddress'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <DashboardErrorBoundary>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-lg font-bold">{t('savedAddresses')}</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {addresses.length} {t('addressCount')}
              </p>
            </div>
            <Dialog
              open={showForm}
              onOpenChange={(o) => {
                if (!o) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <PremiumButton variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  + {t('addNewAddress')}
                </PremiumButton>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? t('editAddress') : t('addNewAddress')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex gap-1.5">
                    {[t('labelHome'), t('labelOffice'), t('labelOther')].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setForm({ ...form, label: l })}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                          form.label === l
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('fullName')}</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('phone')}</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('streetAddress')}</Label>
                    <Input
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">{t('city')}</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('district')}</Label>
                      <Input
                        value={form.district}
                        onChange={(e) => setForm({ ...form, district: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('postalCode')}</Label>
                      <Input
                        value={form.postalCode}
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="border-border rounded"
                    />
                    {t('setAsDefault')}
                  </label>
                  <PremiumButton
                    variant="primary"
                    type="submit"
                    disabled={createAddress.isPending || updateAddress.isPending}
                    className="w-full"
                  >
                    {editingId ? t('saveChanges') : t('saveAddress')}
                  </PremiumButton>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <AddressSkeleton />
        ) : addresses.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-14 text-center">
            <MapPin className="text-muted-foreground/30 h-8 w-8" />
            <p className="text-foreground mt-2 text-sm font-bold">{t('noSavedAddresses')}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t('addDeliveryAddress')}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => {
              const LabelIcon = labelIcons[addr.label] ?? MapPin;
              return (
                <div
                  key={addr.id}
                  className={cn(
                    'bg-card relative rounded-xl border p-4 transition-all duration-200 hover:shadow-sm',
                    addr.isDefault ? 'border-primary/30' : 'border-border'
                  )}
                >
                  {addr.isDefault && (
                    <Badge className="absolute right-2.5 top-2.5 text-[9px]" variant="secondary">
                      <Star className="fill-primary text-primary mr-0.5 h-3 w-3" /> {t('default')}
                    </Badge>
                  )}
                  <div className="flex items-start gap-2.5">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        addr.isDefault ? 'bg-primary/10' : 'bg-muted'
                      )}
                    >
                      <LabelIcon
                        className={cn(
                          'h-4 w-4',
                          addr.isDefault ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-sm font-semibold">{addr.name}</p>
                      <p className="text-muted-foreground text-xs">{addr.phone}</p>
                      <p className="text-muted-foreground text-xs">{addr.street}</p>
                      <p className="text-muted-foreground text-xs">
                        {addr.city}
                        {addr.district ? `, ${addr.district}` : ''}
                        {addr.postalCode ? ` - ${addr.postalCode}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="border-border mt-3 flex items-center gap-1.5 border-t pt-2.5">
                    <button
                      onClick={() => openEdit(addr)}
                      className="text-muted-foreground hover:bg-muted hover:text-primary flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                    >
                      <Edit3 className="h-3 w-3" /> {t('edit')}
                    </button>
                    <button
                      onClick={() => setDeleteId(addr.id)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> {t('delete')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(o) => {
            if (!o) setDeleteId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteAddress')}</AlertDialogTitle>
              <AlertDialogDescription>{t('deleteAddressConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteAddress.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('delete')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardErrorBoundary>
  );
}

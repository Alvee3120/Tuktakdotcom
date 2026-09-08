'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProductForm, type ProductPayload } from '@/components/dashboard/ProductForm';
import {
  useAdminProduct,
  useSyncVariants,
  useUpdateProduct,
  type VariantInput,
} from '@/hooks/useAdmin';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const { data, isLoading, isError, refetch } = useAdminProduct(productId);
  const updateProduct = useUpdateProduct();
  const syncVariants = useSyncVariants();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: ProductPayload, variants: VariantInput[]) => {
    setSaving(true);
    try {
      await updateProduct.mutateAsync({ id: productId, data: payload });
      // Only re-sync variants when they actually changed. The sync endpoint
      // replaces the full variant set AND recomputes product.stock from the
      // incoming rows, so calling it with an untouched/empty list would wipe
      // standalone stock to 0 (and reorder/deactivate nothing — harmless —
      // but the stock reset is destructive).
      const initialVariants = data?.data?.variants ?? [];
      const variantKey = (v: {
        id?: string;
        name: string;
        sku?: string | null;
        price: number;
        compareAtPrice?: number | null;
        stock: number;
        image?: string | null;
        isActive: boolean;
      }) =>
        [
          v.id ?? '',
          v.name,
          v.sku ?? '',
          v.price,
          v.compareAtPrice ?? '',
          v.stock,
          v.image ?? '',
          v.isActive,
        ].join('|');
      const changed =
        JSON.stringify(initialVariants.map(variantKey)) !==
        JSON.stringify(variants.map(variantKey));
      if (changed) {
        await syncVariants.mutateAsync({ productId, variants });
      }
      toast.success('Product updated');
      router.push('/admin/products');
    } catch (err) {
      toast.error('Failed to update product', {
        description:
          err instanceof Error
            ? err.message
            : 'Check that the slug is unique and all fields are valid.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-muted-foreground/70 mt-3 text-sm">Loading product…</p>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="text-muted-foreground mt-3 text-sm font-medium">Product not found</p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => refetch()}
            className="border-border text-foreground hover:bg-muted/50 rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/admin/products')}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      key={data.data.id}
      initial={data.data}
      saving={saving}
      submitLabel="Save Changes"
      onSubmit={handleSubmit}
      onCancel={() => router.push('/admin/products')}
    />
  );
}

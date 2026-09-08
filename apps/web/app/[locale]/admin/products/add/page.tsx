'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProductForm, type ProductPayload } from '@/components/dashboard/ProductForm';
import { useCreateProduct, useSyncVariants, type VariantInput } from '@/hooks/useAdmin';

export default function AddProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const syncVariants = useSyncVariants();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: ProductPayload, variants: VariantInput[]) => {
    setSaving(true);
    try {
      const res = (await createProduct.mutateAsync(payload)) as {
        success: boolean;
        data: { id: string };
      };
      if (variants.length > 0) {
        await syncVariants.mutateAsync({ productId: res.data.id, variants });
      }
      toast.success('Product created');
      router.push('/admin/products');
    } catch (err) {
      toast.error('Failed to create product', {
        description:
          err instanceof Error
            ? err.message
            : 'Check that the slug is unique and all fields are valid.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProductForm
      saving={saving}
      submitLabel="Publish Product"
      onSubmit={handleSubmit}
      onCancel={() => router.push('/admin/products')}
    />
  );
}

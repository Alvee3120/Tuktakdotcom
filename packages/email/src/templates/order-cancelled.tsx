import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Heading,
  Button,
  Tailwind,
  Section,
  Hr,
} from '@react-email/components';

type OrderCancelledEmailProps = {
  orderId: string;
  customerName: string;
  reason?: string;
  refundAmount?: number;
};

export function OrderCancelledEmail({
  orderId,
  customerName,
  reason,
  refundAmount,
}: OrderCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] rounded-xl bg-white p-8 shadow-sm">
            <Section className="mb-6 text-center">
              <Heading className="text-3xl font-bold">
                Tuk<span className="text-[#ff6b00]">tak</span>
              </Heading>
            </Section>

            <div className="mb-6 rounded-lg bg-red-50 p-4 text-center">
              <Text className="text-2xl">❌</Text>
              <Heading className="text-xl font-bold text-red-800">Order Cancelled</Heading>
              <Text className="mt-1 text-sm text-red-600">
                Hi {customerName}, your order has been cancelled.
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Order ID</Text>
              <Text className="font-mono text-sm font-semibold">{orderId}</Text>
            </Section>

            {reason && (
              <Section className="mt-4">
                <Text className="text-sm font-semibold text-gray-900">Cancellation Reason</Text>
                <Text className="mt-1 text-sm text-gray-600">{reason}</Text>
              </Section>
            )}

            {refundAmount && refundAmount > 0 && (
              <Section className="mt-4 rounded-lg bg-yellow-50 p-4">
                <Text className="text-center text-sm font-semibold text-yellow-800">
                  Refund Amount: ৳{refundAmount.toLocaleString()}
                </Text>
                <Text className="mt-1 text-center text-xs text-yellow-600">
                  Your refund will be processed within 3-5 business days.
                </Text>
              </Section>
            )}

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">Need help?</Text>
              <Text className="mt-2 text-sm text-gray-600">
                If you have any questions about this cancellation, please contact our support team.
              </Text>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href="https://tuktak.com/contact"
            >
              Contact Support
            </Button>

            <Button
              className="mt-3 block w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-center text-sm font-semibold text-gray-700"
              href="https://tuktak.com/products"
            >
              Continue Shopping
            </Button>

            <Hr className="my-6 border-gray-200" />

            <Text className="text-center text-xs text-gray-400">
              © {new Date().getFullYear()} Tuktak.com. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

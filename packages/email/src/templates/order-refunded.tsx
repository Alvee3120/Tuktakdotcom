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

type OrderRefundedEmailProps = {
  orderId: string;
  customerName: string;
  refundAmount: number;
  refundMethod?: string;
  reason?: string;
};

export function OrderRefundedEmail({
  orderId,
  customerName,
  refundAmount,
  refundMethod,
  reason,
}: OrderRefundedEmailProps) {
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

            <div className="mb-6 rounded-lg bg-purple-50 p-4 text-center">
              <Text className="text-2xl">💰</Text>
              <Heading className="text-xl font-bold text-purple-800">Refund Processed</Heading>
              <Text className="mt-1 text-sm text-purple-600">
                Hi {customerName}, your refund has been processed successfully.
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Order ID</Text>
              <Text className="font-mono text-sm font-semibold">{orderId}</Text>
            </Section>

            <Section className="mt-4 rounded-lg bg-green-50 p-4">
              <Text className="text-center text-lg font-bold text-green-800">
                ৳{refundAmount.toLocaleString()}
              </Text>
              <Text className="mt-1 text-center text-sm text-green-600">Refund Amount</Text>
              {refundMethod && (
                <Text className="mt-2 text-center text-xs text-green-600">
                  Refunded to: {refundMethod}
                </Text>
              )}
            </Section>

            {reason && (
              <Section className="mt-4">
                <Text className="text-sm font-semibold text-gray-900">Reason</Text>
                <Text className="mt-1 text-sm text-gray-600">{reason}</Text>
              </Section>
            )}

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">Refund Timeline</Text>
              <Text className="mt-2 text-sm text-gray-600">• bKash/Nagad: 1-2 business days</Text>
              <Text className="text-sm text-gray-600">• Bank Transfer: 3-5 business days</Text>
              <Text className="text-sm text-gray-600">• Credit/Debit Card: 5-10 business days</Text>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href={`https://tuktak.com/orders/${orderId}`}
            >
              View Order Details
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

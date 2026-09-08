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

type OrderDeliveredEmailProps = {
  orderId: string;
  customerName: string;
  deliveredAt?: string;
};

export function OrderDeliveredEmail({
  orderId,
  customerName,
  deliveredAt,
}: OrderDeliveredEmailProps) {
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

            <div className="mb-6 rounded-lg bg-green-50 p-4 text-center">
              <Text className="text-2xl">🎉</Text>
              <Heading className="text-xl font-bold text-green-800">Order Delivered!</Heading>
              <Text className="mt-1 text-sm text-green-600">
                Hi {customerName}, your order has been delivered successfully!
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Order ID</Text>
              <Text className="font-mono text-sm font-semibold">{orderId}</Text>
              {deliveredAt && (
                <Text className="mt-2 text-xs text-gray-500">Delivered on: {deliveredAt}</Text>
              )}
            </Section>

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">How was your experience?</Text>
              <Text className="mt-2 text-sm text-gray-600">
                We'd love to hear your feedback! Rate your experience and help us improve.
              </Text>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href={`https://tuktak.com/orders/${orderId}/review`}
            >
              Rate Your Experience
            </Button>

            <Button
              className="mt-3 block w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-center text-sm font-semibold text-gray-700"
              href={`https://tuktak.com/products`}
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

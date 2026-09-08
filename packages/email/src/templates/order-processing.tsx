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

type OrderProcessingEmailProps = {
  orderId: string;
  customerName: string;
};

export function OrderProcessingEmail({ orderId, customerName }: OrderProcessingEmailProps) {
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

            <div className="mb-6 rounded-lg bg-amber-50 p-4 text-center">
              <Text className="text-2xl">⚙️</Text>
              <Heading className="text-xl font-bold text-amber-800">Order Processing</Heading>
              <Text className="mt-1 text-sm text-amber-600">
                Hi {customerName}, your order is now being processed and prepared for shipment.
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Text className="text-xs text-gray-500">Order ID</Text>
              <Text className="font-mono text-sm font-semibold">{orderId}</Text>
            </Section>

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">What happens next?</Text>
              <Text className="mt-2 text-sm text-gray-600">
                • Our team is preparing your items for shipment
              </Text>
              <Text className="text-sm text-gray-600">
                • You'll receive a shipping notification with tracking details
              </Text>
              <Text className="text-sm text-gray-600">
                • Estimated delivery: 1-3 business days (Inside Dhaka) or 3-5 days (Outside Dhaka)
              </Text>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href={`https://tuktak.com/orders/${orderId}`}
            >
              Track Your Order
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

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
  Row,
  Column,
} from '@react-email/components';

type OrderShippedEmailProps = {
  orderId: string;
  customerName: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  carrier?: string;
};

export function OrderShippedEmail({
  orderId,
  customerName,
  trackingNumber,
  estimatedDelivery,
  carrier,
}: OrderShippedEmailProps) {
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

            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center">
              <Text className="text-2xl">📦</Text>
              <Heading className="text-xl font-bold text-blue-800">
                Your Order Has Been Shipped!
              </Heading>
              <Text className="mt-1 text-sm text-blue-600">
                Hi {customerName}, great news! Your order is on its way to you.
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Row>
                <Column>
                  <Text className="text-xs text-gray-500">Order ID</Text>
                  <Text className="font-mono text-sm font-semibold">{orderId}</Text>
                </Column>
                {trackingNumber && (
                  <Column>
                    <Text className="text-xs text-gray-500">Tracking #</Text>
                    <Text className="font-mono text-sm font-semibold">{trackingNumber}</Text>
                  </Column>
                )}
                {carrier && (
                  <Column className="text-right">
                    <Text className="text-xs text-gray-500">Carrier</Text>
                    <Text className="text-sm font-semibold">{carrier}</Text>
                  </Column>
                )}
              </Row>
            </Section>

            {estimatedDelivery && (
              <Section className="mt-4 rounded-lg bg-green-50 p-4">
                <Text className="text-center text-sm font-semibold text-green-800">
                  Estimated Delivery: {estimatedDelivery}
                </Text>
              </Section>
            )}

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">Shipping Progress</Text>
              <div className="mt-4 flex justify-between">
                <div className="text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#ff6b00]">
                    <Text className="text-xs text-white">✓</Text>
                  </div>
                  <Text className="mt-1 text-xs text-gray-600">Shipped</Text>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                    <Text className="text-xs text-gray-500">2</Text>
                  </div>
                  <Text className="mt-1 text-xs text-gray-600">In Transit</Text>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                    <Text className="text-xs text-gray-500">3</Text>
                  </div>
                  <Text className="mt-1 text-xs text-gray-600">Delivered</Text>
                </div>
              </div>
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

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
  Row,
  Column,
} from '@react-email/components';

type ShippingUpdateEmailProps = {
  orderId: string;
  customerName: string;
  status: 'shipped' | 'out-for-delivery' | 'delivered';
  trackingNumber?: string;
  estimatedDelivery?: string;
};

const STATUS_CONFIG = {
  shipped: {
    title: 'Your Order Has Been Shipped!',
    emoji: '📦',
    message: 'Good news! Your order is on its way.',
    color: '#2563eb',
  },
  'out-for-delivery': {
    title: 'Out for Delivery!',
    emoji: '🚚',
    message: 'Your package will arrive today.',
    color: '#f59e0b',
  },
  delivered: {
    title: 'Order Delivered!',
    emoji: '✅',
    message: 'Your package has been delivered successfully.',
    color: '#16a34a',
  },
};

export function ShippingUpdateEmail({
  orderId,
  customerName,
  status,
  trackingNumber,
  estimatedDelivery,
}: ShippingUpdateEmailProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] p-8">
            <div className="mb-6 text-center">
              <Text className="text-4xl">{config.emoji}</Text>
              <Heading className="mt-2 text-2xl font-bold text-gray-900">{config.title}</Heading>
              <Text className="mt-2 text-gray-600">{config.message}</Text>
            </div>

            <Text className="text-gray-600">Hi {customerName},</Text>

            <Section className="mt-4 rounded-lg border border-gray-200 p-4">
              <Row>
                <Column className="w-1/3">
                  <Text className="text-xs text-gray-500">Order ID</Text>
                  <Text className="font-mono text-sm font-semibold">{orderId}</Text>
                </Column>
                {trackingNumber && (
                  <Column className="w-1/3">
                    <Text className="text-xs text-gray-500">Tracking #</Text>
                    <Text className="font-mono text-sm font-semibold">{trackingNumber}</Text>
                  </Column>
                )}
                {estimatedDelivery && (
                  <Column className="w-1/3">
                    <Text className="text-xs text-gray-500">Estimated Delivery</Text>
                    <Text className="text-sm font-semibold">{estimatedDelivery}</Text>
                  </Column>
                )}
              </Row>
            </Section>

            {/* Status Progress */}
            <Section className="mt-6">
              <Row>
                {(['shipped', 'out-for-delivery', 'delivered'] as const).map((step) => {
                  const isActive =
                    step === 'shipped' ||
                    (step === 'out-for-delivery' &&
                      (status === 'out-for-delivery' || status === 'delivered')) ||
                    (step === 'delivered' && status === 'delivered');
                  return (
                    <Column key={step} className="text-center">
                      <div
                        className={`mx-auto h-3 w-3 rounded-full ${isActive ? 'bg-[#ff6b00]' : 'bg-gray-300'}`}
                      />
                      <Text className="mt-1 text-xs capitalize text-gray-500">
                        {step.replace(/-/g, ' ')}
                      </Text>
                    </Column>
                  );
                })}
              </Row>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href={`https://tuktak.com/orders/${orderId}`}
            >
              Track Your Order
            </Button>

            <Text className="mt-8 text-xs text-gray-400">
              © {new Date().getFullYear()} Tuktak.com. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

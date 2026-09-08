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

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type OrderConfirmedEmailProps = {
  orderId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  deliveryAddress?: string;
};

export function OrderConfirmedEmail({
  orderId,
  customerName,
  items,
  total,
  paymentMethod,
  deliveryAddress,
}: OrderConfirmedEmailProps) {
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
              <Text className="text-2xl">📋</Text>
              <Heading className="text-xl font-bold text-blue-800">Order Confirmed</Heading>
              <Text className="mt-1 text-sm text-blue-600">
                Hi {customerName}, your order has been confirmed and is being prepared.
              </Text>
            </div>

            <Section className="rounded-lg border border-gray-200 p-4">
              <Row>
                <Column>
                  <Text className="text-xs text-gray-500">Order ID</Text>
                  <Text className="font-mono text-sm font-semibold">{orderId}</Text>
                </Column>
                <Column className="text-right">
                  <Text className="text-xs text-gray-500">Payment</Text>
                  <Text className="text-sm font-semibold">{paymentMethod}</Text>
                </Column>
              </Row>
            </Section>

            <Section className="mt-6">
              <Text className="text-sm font-semibold text-gray-900">Order Items</Text>
              <div className="mt-2 rounded-lg border border-gray-200">
                {items.map((item, i) => (
                  <Row key={i} className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <Column className="w-2/3">
                      <Text className="text-sm text-gray-900">{item.name}</Text>
                      <Text className="text-xs text-gray-500">Qty: {item.quantity}</Text>
                    </Column>
                    <Column className="w-1/3 text-right">
                      <Text className="text-sm font-medium text-gray-900">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </Text>
                    </Column>
                  </Row>
                ))}
                <Row className="border-t border-gray-200 px-4 py-3">
                  <Column>
                    <Text className="text-sm font-bold text-gray-900">Total</Text>
                  </Column>
                  <Column className="text-right">
                    <Text className="text-base font-bold text-[#ff6b00]">
                      ৳{total.toLocaleString()}
                    </Text>
                  </Column>
                </Row>
              </div>
            </Section>

            {deliveryAddress && (
              <Section className="mt-4">
                <Text className="text-sm font-semibold text-gray-900">Delivery Address</Text>
                <Text className="mt-1 text-sm text-gray-600">{deliveryAddress}</Text>
              </Section>
            )}

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

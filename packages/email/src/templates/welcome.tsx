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

type WelcomeEmailProps = {
  name: string;
};

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] rounded-xl bg-white p-8 shadow-sm">
            {/* Branding */}
            <Section className="mb-6 text-center">
              <Heading className="text-3xl font-bold">
                Tuk<span className="text-[#ff6b00]">tak</span>
              </Heading>
              <Text className="text-sm text-gray-500">Premium Electronics & Gadgets</Text>
            </Section>

            <Hr className="my-4 border-gray-200" />

            <Heading className="mt-6 text-2xl font-bold text-gray-900">Welcome, {name}!</Heading>
            <Text className="mt-4 text-gray-600">
              Thank you for joining Tuktak — your one-stop shop for premium electronics and gadgets
              in Bangladesh.
            </Text>

            {/* Features */}
            <Section className="mt-6 rounded-lg bg-gray-50 p-4">
              <Text className="text-sm font-semibold text-gray-900">What you can do:</Text>
              <Text className="mt-2 text-sm text-gray-600">
                • Browse 1000+ genuine products at the best prices
              </Text>
              <Text className="text-sm text-gray-600">• Enjoy same-day delivery inside Dhaka</Text>
              <Text className="text-sm text-gray-600">• Track your orders in real-time</Text>
              <Text className="text-sm text-gray-600">
                • Get exclusive member-only deals and offers
              </Text>
            </Section>

            <Button
              className="mt-6 block w-full rounded-lg bg-[#ff6b00] px-6 py-3 text-center text-sm font-semibold text-white"
              href="https://tuktak.com/products"
            >
              Start Shopping
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

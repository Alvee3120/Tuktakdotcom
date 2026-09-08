import { Html, Head, Body, Container, Text, Heading, Tailwind } from '@react-email/components';

type OTPEmailProps = {
  code: string;
  expiresAt: string;
};

export function OTPEmail({ code, expiresAt }: OTPEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto max-w-[600px] p-8">
            <Heading className="text-2xl font-bold text-gray-900">Your Verification Code</Heading>
            <Text className="mt-4 text-gray-600">
              Use the following code to verify your identity:
            </Text>
            <Text className="my-6 text-center text-4xl font-bold tracking-widest text-[#ff6b00]">
              {code}
            </Text>
            <Text className="text-sm text-gray-500">
              This code expires at {expiresAt}. Do not share this code with anyone.
            </Text>
            <Text className="mt-8 text-xs text-gray-400">
              © {new Date().getFullYear()} Tuktak.com. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

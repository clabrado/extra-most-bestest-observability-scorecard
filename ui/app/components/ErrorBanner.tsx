import React from "react";
import { Flex } from "@dynatrace/strato-components/layouts";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";

export interface ErrorBannerProps {
  title: string;
  error: Error;
}

/**
 * Surfaces a failed query without leaking internals — missing scopes are the
 * usual cause and the message from the platform already names them.
 */
export const ErrorBanner = ({ title, error }: ErrorBannerProps) => (
  <Flex
    flexDirection="column"
    gap={8}
    padding={16}
    minHeight={120}
    style={{
      border: `1px solid ${Colors.Charts.Status.Critical.Default}`,
      borderRadius: 4,
    }}
  >
    <Text
      style={{ color: Colors.Charts.Status.Critical.Default, fontWeight: 600 }}
    >
      {title}
    </Text>
    <Text>{error.message}</Text>
  </Flex>
);

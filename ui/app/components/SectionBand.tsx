import React from "react";
import { Text } from "@dynatrace/strato-components/typography";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { gradeChipStyle } from "../lib/tileStyles";

export interface SectionBandProps {
  title: string;
  grade?: string;
  gradeColor?: string;
  children?: React.ReactNode;
}

/** Uppercase section label left, grade chip or controls right. */
export const SectionBand = ({
  title,
  grade,
  gradeColor,
  children,
}: SectionBandProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      minHeight: 40,
      paddingBottom: 10,
      borderBottom: `1px solid ${Colors.Border.Neutral.Subdued}`,
    }}
  >
    <Text
      style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        opacity: 0.8,
      }}
    >
      {title}
    </Text>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {children}
      {grade && gradeColor && (
        <span style={gradeChipStyle(gradeColor)}>{grade}</span>
      )}
    </div>
  </div>
);

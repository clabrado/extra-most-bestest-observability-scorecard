import React from "react";
import Colors from "@dynatrace/strato-design-tokens/colors";

/** Every tile in a row is pinned to the same height so rows stay symmetrical. */
export const TILE_HEIGHT = 212;
export const HERO_HEIGHT = 240;

export const LABEL_SIZE = 13;
export const VALUE_SIZE = 40;
export const DELTA_SIZE = 14;
export const SUB_SIZE = 13;

export function tileStyle(accent: string, height: number): React.CSSProperties {
  return {
    height,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 8,
    padding: "18px 20px",
    minWidth: 0,
    borderRadius: 8,
    border: `1px solid ${Colors.Border.Neutral.Subdued}`,
    borderLeft: `4px solid ${accent}`,
    background: Colors.Background.Surface.Default,
    boxSizing: "border-box",
    overflow: "hidden",
  };
}

export const labelStyle: React.CSSProperties = {
  fontSize: LABEL_SIZE,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: Colors.Text.Neutral.Default,
  opacity: 0.75,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export function valueStyle(color: string): React.CSSProperties {
  return {
    fontSize: VALUE_SIZE,
    lineHeight: 1.05,
    fontWeight: 700,
    color,
    margin: 0,
    whiteSpace: "nowrap",
  };
}

export const subStyle: React.CSSProperties = {
  fontSize: SUB_SIZE,
  opacity: 0.7,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export function gradeChipStyle(color: string): React.CSSProperties {
  return {
    fontSize: LABEL_SIZE,
    fontWeight: 700,
    color,
    border: `1px solid ${color}`,
    borderRadius: 4,
    padding: "2px 8px",
    whiteSpace: "nowrap",
  };
}

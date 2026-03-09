import { Chip, Stack } from "@mui/material";
import type { ChipProps } from "@mui/material/Chip";

export type StatusChipItem = {
  key: string;
  label: string;
  color?: ChipProps["color"];
  variant?: ChipProps["variant"];
  icon?: ChipProps["icon"];
};

type StatusChipSetProps = {
  items: StatusChipItem[];
  size?: ChipProps["size"];
};

export function StatusChipSet({ items, size = "small" }: StatusChipSetProps) {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Chip
          key={item.key}
          size={size}
          variant={item.variant ?? "outlined"}
          color={item.color ?? "default"}
          icon={item.icon}
          label={item.label}
        />
      ))}
    </Stack>
  );
}

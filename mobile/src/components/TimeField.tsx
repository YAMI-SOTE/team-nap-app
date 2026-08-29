import { type ReactNode, useState } from "react";

import SettingsValueRow from "@/components/SettingsValueRow";
import TimePickerModal from "@/components/TimePickerModal";

type TimeFieldProps = {
  /** Icon node shown inside the row's round badge. */
  icon: ReactNode;
  label: string;
  /** Current time as "HH:MM". */
  value: string;
  onChange: (value: string) => void;
};

/**
 * An editable time row: tapping it opens a `TimePickerModal`. Reuses
 * `SettingsValueRow` for the row visual.
 */
export default function TimeField({
  icon,
  label,
  value,
  onChange,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsValueRow
        icon={icon}
        label={label}
        value={value}
        onPress={() => setOpen(true)}
      />
      <TimePickerModal
        visible={open}
        value={value}
        title={label}
        onCancel={() => setOpen(false)}
        onConfirm={(next) => {
          setOpen(false);
          onChange(next);
        }}
      />
    </>
  );
}

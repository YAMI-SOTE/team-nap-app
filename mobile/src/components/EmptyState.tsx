import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import PillButton from "@/components/PillButton";

type EmptyStateProps = {
  image: ImageSourcePropType;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Centered illustration + copy + optional CTA. Used for the "no schedule"
 * and "no nap records" screens.
 */
export default function EmptyState({
  image,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Image source={image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PillButton
            variant="primary"
            label={actionLabel}
            elevated={false}
            onPress={onAction}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xs,
  },
  image: {
    width: 168,
    height: 168,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
    marginTop: spacing.lg,
  },
});

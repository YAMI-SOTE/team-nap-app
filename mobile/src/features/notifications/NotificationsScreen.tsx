import { Fragment, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { colors } from "@/theme/colors";
import { useNotifications } from "@/hooks/useNotifications";
import AuroraBackdrop from "@/components/AuroraBackdrop";
import ScreenHeader from "@/components/ScreenHeader";
import NotificationCard from "@/components/NotificationCard";
import {
  BellIcon,
  HeartIcon,
  MoonStarsIcon,
  SealCheckIcon,
  TimerIcon,
  UsersThreeIcon,
} from "@/components/icons";

import type { NotificationKind } from "@/types/api";

const ICON_BY_KIND: Record<
  NotificationKind,
  (color: string) => ReactNode
> = {
  team_nap_suggestion: (color) => <MoonStarsIcon size={20} color={color} />,
  wake_request: (color) => <BellIcon size={20} color={color} />,
  rest_request: (color) => <HeartIcon size={20} color={color} />,
  nap_ended: (color) => <TimerIcon size={20} color={color} />,
  weekly_review: (color) => <SealCheckIcon size={20} color={color} />,
  member_joined: (color) => <UsersThreeIcon size={20} color={color} />,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { groups, loading, error, markRead } = useNotifications();

  return (
    <View style={styles.root}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader title="お知らせ" onBack={() => router.back()} />

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.stateBlock}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : groups.length === 0 ? (
            <View style={styles.stateBlock}>
              <Text style={styles.emptyText}>お知らせはありません</Text>
            </View>
          ) : (
            groups.map((group) => (
              <Fragment key={group.key}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => (
                  <NotificationCard
                    key={item.id}
                    renderIcon={ICON_BY_KIND[item.kind]}
                    title={item.title}
                    body={item.body}
                    timestamp={item.timestamp}
                    unread={!item.read}
                    onPress={() => markRead(item.id)}
                  />
                ))}
              </Fragment>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textTertiary,
    paddingTop: 8,
    paddingBottom: 2,
  },
  stateBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.error,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textTertiary,
    textAlign: "center",
  },
});

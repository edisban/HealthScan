import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "@/components/ui";
import type { Theme } from "@/constants/theme";
import { styles } from "./styles";

interface LoadingCardProps {
  theme: Theme;
  title: string;
  subtitle?: string;
  // Shown during the web search, which can take up to 45 s
  skipLabel?: string;
  onSkip?: () => void;
}

export const LoadingCard = ({ theme, title, subtitle, skipLabel, onSkip }: LoadingCardProps) => (
  <View style={styles.centerFill} testID="loading">
    <Card style={styles.stateCard}>
      <View style={[styles.stateIcon, { backgroundColor: theme.palette.primary.main + "22" }]}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.palette.text.primary }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.stateSub, { color: theme.palette.text.secondary }]}>{subtitle}</Text>}
      {!!onSkip && (
        <Button variant="ghost" onPress={onSkip} style={styles.fullWidth}>
          {skipLabel}
        </Button>
      )}
    </Card>
  </View>
);

interface ErrorCardProps {
  theme: Theme;
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}

export const ErrorCard = ({ theme, title, message, retryLabel, onRetry }: ErrorCardProps) => (
  <View style={styles.centerFill} testID="error">
    <Card style={styles.stateCard}>
      <View style={[styles.stateIcon, { backgroundColor: theme.palette.error.soft }]}>
        <Ionicons name="cloud-offline-outline" size={30} color={theme.palette.error.main} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.palette.text.primary }]}>{title}</Text>
      <Text style={[styles.stateSub, { color: theme.palette.text.secondary }]}>{message}</Text>
      <Button onPress={onRetry} icon="refresh" style={styles.fullWidth}>
        {retryLabel}
      </Button>
    </Card>
  </View>
);

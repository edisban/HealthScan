import { View, ActivityIndicator, StyleSheet } from "react-native";

interface LoaderProps {
  visible?: boolean;
}

export const Loader = ({ visible = true }: LoaderProps) => (
  <View style={styles.center}>
    {visible && <ActivityIndicator size="large" color="#6366f1" />}
  </View>
);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Background } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

// The intro fades out after FADE_AT_MS and is gone at INTRO_MS; a tap skips it
export const FADE_AT_MS = 1600;
export const INTRO_MS = 1900;

// The native driver is not available on web; there the JS driver animates the same values
const useNativeDriver = Platform.OS !== "web";

interface IntroProps {
  onDone: () => void;
}

/** Short animated intro shown over the home screen when the app opens. */
export const Intro = ({ onDone }: IntroProps) => {
  const { theme } = useTheme();
  const { strings } = useLanguage();
  const logo = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    timers.current.forEach(clearTimeout);
    onDone();
  };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (reduceMotion) {
          // Reduce Motion: show everything at once, no movement
          [logo, title, tagline].forEach((value) => value.setValue(1));
          return;
        }
        Animated.parallel([
          Animated.spring(logo, { toValue: 1, friction: 6, tension: 60, useNativeDriver }),
          Animated.timing(title, { toValue: 1, duration: 400, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver }),
          Animated.timing(tagline, { toValue: 1, duration: 400, delay: 450, easing: Easing.out(Easing.cubic), useNativeDriver }),
        ]).start();
      })
      .catch(() => [logo, title, tagline].forEach((value) => value.setValue(1)));

    timers.current = [
      setTimeout(() => Animated.timing(fade, { toValue: 0, duration: INTRO_MS - FADE_AT_MS, useNativeDriver }).start(), FADE_AT_MS),
      setTimeout(finish, INTRO_MS),
    ];
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const rise = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} testID="intro">
      <Pressable style={styles.fill} onPress={finish} accessibilityRole="button" accessibilityLabel={strings.appTitle}>
        <Background>
          <Animated.View style={[styles.center]}>
            <Animated.View
              style={{
                opacity: logo,
                transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              }}
            >
              <LinearGradient
                colors={[theme.palette.primary.main, theme.palette.accent.main]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Ionicons name="leaf" size={46} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Animated.View style={rise(title)}>
              <Text style={[styles.title, { color: theme.palette.text.primary }]}>{strings.appTitle}</Text>
            </Animated.View>
            <Animated.View style={rise(tagline)}>
              <Text style={[styles.tagline, { color: theme.palette.text.secondary }]}>{strings.subtitle}</Text>
            </Animated.View>
          </Animated.View>
        </Background>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  logo: { width: 96, height: 96, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -0.8, textAlign: "center" },
  tagline: { fontSize: 16, lineHeight: 22, marginTop: 8, textAlign: "center" },
});

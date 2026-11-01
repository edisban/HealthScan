import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "library";

/** Asks for permission, opens the camera or photo library, and returns the picked image URI (null if cancelled). */
export const getPhotoUri = async (
  source: PhotoSource,
  options: ImagePicker.ImagePickerOptions = {}
): Promise<string | null> => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted !== true) {
    throw new Error(source === "camera" ? "Camera permission required" : "Photo library permission required");
  }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, ...options })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, ...options });
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
};

/** Reads a local image as a base64 data URL (avoids React Native FormData upload issues). */
export const uriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Failed to read image");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

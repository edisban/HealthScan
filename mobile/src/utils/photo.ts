import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "library";

export interface Photo {
  uri: string;
  // data URL ("data:image/jpeg;base64,...") ready to send to the backend
  dataUrl: string;
}

/**
 * Asks for permission, opens the camera or photo library, and returns the picked photo (null if cancelled).
 * The picker returns base64 directly, which avoids slow fetch().blob() round trips through the native blob store.
 */
export const getPhoto = async (
  source: PhotoSource,
  options: ImagePicker.ImagePickerOptions = {}
): Promise<Photo | null> => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.granted !== true) {
    throw new Error(source === "camera" ? "Camera permission required" : "Photo library permission required");
  }
  const pickerOptions: ImagePicker.ImagePickerOptions = { quality: 0.7, base64: true, ...options };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], ...pickerOptions });
  const asset = result.canceled ? undefined : result.assets?.[0];
  if (!asset) return null;
  if (!asset.base64) throw new Error("Failed to read image");
  return { uri: asset.uri, dataUrl: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` };
};

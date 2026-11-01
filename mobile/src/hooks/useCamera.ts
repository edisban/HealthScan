import { useState, useEffect } from "react";
import { useCameraPermissions } from "expo-camera";

export interface CameraPermission {
  granted: boolean;
  request: () => Promise<boolean>;
}

export const useCamera = (): CameraPermission => {
  const [permission, requestPermission] = useCameraPermissions();
  const [granted, setGranted] = useState<boolean>(permission?.granted === true);

  useEffect(() => {
    if (permission) {
      setGranted(permission.granted === true);
    }
  }, [permission]);

  const request = async (): Promise<boolean> => {
    const { status } = await requestPermission();
    setGranted(status === "granted");
    return status === "granted";
  };

  return { granted, request: request };
};
